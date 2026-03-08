import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/permissions
 *
 * Returns the authenticated user's permission keys, role names, system flag, and user ID.
 * Used by the client-side PermissionsProvider so it never queries
 * application tables directly — all data access goes through this API route.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { permissions: [], roles: [], isSystemUser: false, userId: null },
      { status: 200 },
    );
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select(
      'is_system, role:roles!inner(name, role_permissions:role_permissions!inner(permission:permissions!inner(key)))',
    )
    .eq('user_id', user.id);

  if (error || !data) {
    return NextResponse.json(
      { permissions: [], roles: [], isSystemUser: false, userId: user.id },
      { status: 200 },
    );
  }

  const permissionKeys = new Set<string>();
  const roleNames = new Set<string>();
  let isSystemUser = false;

  for (const ur of data) {
    if (ur.is_system) isSystemUser = true;
    const role = ur.role as unknown as {
      name: string;
      role_permissions: { permission: { key: string } }[];
    };
    roleNames.add(role.name);
    for (const rp of role.role_permissions) {
      permissionKeys.add(rp.permission.key);
    }
  }

  return NextResponse.json({
    permissions: Array.from(permissionKeys),
    roles: Array.from(roleNames),
    isSystemUser,
    userId: user.id,
  });
}
