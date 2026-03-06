-- =============================================
-- Migration: Add RBAC functions, password reset tokens, and missing columns
-- =============================================

-- Add is_system column to user_roles if missing
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Add level column to roles if missing
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0;

-- Set levels for existing system roles
UPDATE roles SET level = 1 WHERE name = 'Super Admin' AND level = 0;
UPDATE roles SET level = 2 WHERE name = 'Admin' AND level = 0;
UPDATE roles SET level = 3 WHERE name = 'Member' AND level = 0;

-- Password Reset Tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- RLS for password_reset_tokens (admin only via RPC, no direct access)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Admin RPC Functions (SECURITY DEFINER)
-- =============================================

-- Admin: List all users with their roles
DROP FUNCTION IF EXISTS admin_list_users();
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    role_id uuid,
    role_name text,
    role_level integer,
    is_system boolean
) AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:read'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email::text,
        u.created_at,
        u.last_sign_in_at,
        r.id   AS role_id,
        r.name AS role_name,
        COALESCE(r.level, 0) AS role_level,
        COALESCE(ur.is_system, false) AS is_system
    FROM auth.users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Update a user's role (replaces existing assignment)
CREATE OR REPLACE FUNCTION admin_update_user_role(p_user_id uuid, p_role_id uuid)
RETURNS void AS $$
DECLARE
    v_caller_is_system boolean;
    v_target_is_system boolean;
    v_target_role_name text;
    v_new_role_name text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(ur.is_system, false), r.name INTO v_target_is_system, v_target_role_name
    FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id LIMIT 1;

    SELECT r.name INTO v_new_role_name FROM roles r WHERE r.id = p_role_id;

    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot modify a system user';
    END IF;

    IF v_new_role_name = 'Super Admin' AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Only system administrators can assign the Super Admin role';
    END IF;

    DELETE FROM user_roles WHERE user_id = p_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (p_user_id, p_role_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Remove a user's role assignment
CREATE OR REPLACE FUNCTION admin_remove_user_role(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_caller_is_system boolean;
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot modify a system user';
    END IF;

    DELETE FROM user_roles WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Generate a 24-hour password reset token
CREATE OR REPLACE FUNCTION admin_generate_reset_token(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_token uuid;
    v_caller_is_system boolean;
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot reset password for a system user';
    END IF;

    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = p_user_id AND used_at IS NULL;

    v_token := uuid_generate_v4();

    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (p_user_id, v_token, NOW() + INTERVAL '24 hours');

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Public: Validate a reset token (no auth required)
CREATE OR REPLACE FUNCTION validate_reset_token(p_token uuid)
RETURNS TABLE (valid boolean, email text) AS $$
BEGIN
    RETURN QUERY
    SELECT
        true  AS valid,
        u.email::text
    FROM password_reset_tokens prt
    JOIN auth.users u ON prt.user_id = u.id
    WHERE prt.token = p_token
      AND prt.used_at IS NULL
      AND prt.expires_at > NOW();

    IF NOT FOUND THEN
        RETURN QUERY SELECT false AS valid, NULL::text AS email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Public: Reset password using a valid token (no auth required)
CREATE OR REPLACE FUNCTION reset_password_with_token(p_token uuid, p_new_password text)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT user_id INTO v_user_id
    FROM password_reset_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND expires_at > NOW();

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = v_user_id;

    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE token = p_token;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Admin: Replace all permissions for a role
CREATE OR REPLACE FUNCTION admin_set_role_permissions(p_role_id uuid, p_permission_ids uuid[])
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'roles:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND is_system = true) THEN
        RAISE EXCEPTION 'Cannot modify system role permissions';
    END IF;

    DELETE FROM role_permissions WHERE role_id = p_role_id;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT p_role_id, unnest(p_permission_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Create a new user with email and password, optionally assign a role
CREATE OR REPLACE FUNCTION admin_create_user(p_email text, p_password text, p_role_id uuid DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_caller_is_system boolean;
    v_new_role_name text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:create'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF p_role_id IS NOT NULL THEN
        SELECT r.name INTO v_new_role_name FROM roles r WHERE r.id = p_role_id;
        IF v_new_role_name = 'Super Admin' THEN
            SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
            FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;
            IF NOT v_caller_is_system THEN
                RAISE EXCEPTION 'Only system administrators can create Super Admin users';
            END IF;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'A user with this email already exists';
    END IF;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        id, instance_id, role, aud, email,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, encrypted_password,
        created_at, updated_at, last_sign_in_at,
        email_confirmed_at, confirmation_sent_at,
        confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        p_email,
        '{"provider":"email","providers":["email"]}', '{}',
        FALSE, crypt(p_password, gen_salt('bf')),
        NOW(), NOW(), NULL, NOW(), NOW(),
        '', '', '', ''
    );

    INSERT INTO auth.identities (id, provider_id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, 'email', v_user_id, json_build_object('sub', v_user_id), NOW(), NOW(), NOW());

    IF p_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, p_role_id);
    END IF;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:delete'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system THEN
        RAISE EXCEPTION 'Cannot delete a system user';
    END IF;

    DELETE FROM password_reset_tokens WHERE user_id = p_user_id;
    DELETE FROM user_roles WHERE user_id = p_user_id;
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    DELETE FROM auth.refresh_tokens WHERE instance_id = '00000000-0000-0000-0000-000000000000' AND user_id = p_user_id::text;
    DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to anon for public reset functions
GRANT EXECUTE ON FUNCTION validate_reset_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_password_with_token(uuid, text) TO anon, authenticated;
