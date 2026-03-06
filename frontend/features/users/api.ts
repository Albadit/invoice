/**
 * Users feature API functions
 * Uses PostgreSQL RPC functions (SECURITY DEFINER) for admin operations
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { AdminUser, Role } from '@/lib/types';

export const usersApi = {
  /**
   * Create a new user with email, password, and optional role
   */
  async createUser(email: string, password: string, roleId?: string): Promise<string> {
    const response = await fetch(`${API_URL}/rpc/admin_create_user`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({
        p_email: email,
        p_password: password,
        p_role_id: roleId || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create user');
    }

    return response.json();
  },

  /**
   * List all users with their role assignments (admin only)
   */
  async list(): Promise<AdminUser[]> {
    const response = await fetch(`${API_URL}/rpc/admin_list_users`, {
      method: 'POST',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  },

  /**
   * Update a user's role assignment
   */
  async updateRole(userId: string, roleId: string): Promise<void> {
    const response = await fetch(`${API_URL}/rpc/admin_update_user_role`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ p_user_id: userId, p_role_id: roleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user role');
    }
  },

  /**
   * Remove a user's role assignment
   */
  async removeRole(userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/rpc/admin_remove_user_role`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ p_user_id: userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove user role');
    }
  },

  /**
   * Generate a 24-hour password reset token for a user
   */
  async generateResetToken(userId: string): Promise<string> {
    const response = await fetch(`${API_URL}/rpc/admin_generate_reset_token`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ p_user_id: userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate reset token');
    }

    // RPC returns the token directly as a JSON string
    return response.json();
  },

  /**
   * Delete a user account
   */
  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/rpc/admin_delete_user`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ p_user_id: userId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to delete user');
    }
  },

  /**
   * Get all available roles (for the role dropdown)
   */
  async getRoles(): Promise<Role[]> {
    const response = await fetch(
      `${API_URL}/roles?select=*&order=name.asc`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json();
  },
};

/**
 * Password reset API — no auth required (uses anon key)
 */
export const resetPasswordApi = {
  /**
   * Validate a reset token
   */
  async validate(token: string): Promise<{ valid: boolean; email: string | null }> {
    const response = await fetch(`${API_URL}/rpc/validate_reset_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ p_token: token }),
    });

    if (!response.ok) {
      return { valid: false, email: null };
    }

    const rows = await response.json();
    // RPC returns an array of rows
    if (Array.isArray(rows) && rows.length > 0) {
      return { valid: rows[0].valid, email: rows[0].email };
    }
    return { valid: false, email: null };
  },

  /**
   * Reset password using a valid token
   */
  async reset(token: string, newPassword: string): Promise<boolean> {
    const response = await fetch(`${API_URL}/rpc/reset_password_with_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ p_token: token, p_new_password: newPassword }),
    });

    if (!response.ok) {
      return false;
    }

    return response.json();
  },
};
