/**
 * Users feature API functions
 * Uses PostgreSQL RPC functions (SECURITY DEFINER) for admin operations
 */

import api, { API_URL, API_KEY } from '@/lib/api/api';
import type { AdminUser, Role } from '@/lib/types';

export const usersApi = {
  /**
   * Create a new user with email, password, and optional role
   */
  async createUser(email: string, password: string, roleId?: string): Promise<string> {
    return api.post<string>(`${API_URL}/rpc/admin_create_user`, {
      p_email: email,
      p_password: password,
      p_role_id: roleId || null,
    });
  },

  /**
   * List all users with their role assignments (admin only)
   */
  async list(): Promise<AdminUser[]> {
    return api.post<AdminUser[]>(`${API_URL}/rpc/admin_list_users`);
  },

  /**
   * Update a user's role assignment
   */
  async updateRole(userId: string, roleId: string): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_update_user_role`, { p_user_id: userId, p_role_id: roleId });
  },

  /**
   * Remove a user's role assignment
   */
  async removeRole(userId: string): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_remove_user_role`, { p_user_id: userId });
  },

  /**
   * Generate a 24-hour password reset token for a user
   */
  async generateResetToken(userId: string): Promise<string> {
    return api.post<string>(`${API_URL}/rpc/admin_generate_reset_token`, { p_user_id: userId });
  },

  /**
   * Delete a user account
   */
  async deleteUser(userId: string): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_delete_user`, { p_user_id: userId });
  },

  /**
   * Delete multiple user accounts
   */
  async deleteMany(userIds: string[]): Promise<void> {
    await Promise.all(userIds.map(id => api.post<void>(`${API_URL}/rpc/admin_delete_user`, { p_user_id: id })));
  },

  /**
   * Get all available roles (for the role dropdown)
   */
  async getRoles(): Promise<Role[]> {
    return api.get<Role[]>(`${API_URL}/roles?select=*&order=name.asc`);
  },
};

/**
 * Password reset API — no auth required (uses anon key only)
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
        'apikey': API_KEY,
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
        'apikey': API_KEY,
      },
      body: JSON.stringify({ p_token: token, p_new_password: newPassword }),
    });

    if (!response.ok) {
      return false;
    }

    return response.json();
  },
};
