/**
 * Roles feature API functions
 * CRUD for roles table + RPC for role_permissions management
 */

import api, { API_URL, getHeaders } from '@/lib/api/api';
import type { Role, Permission } from '@/lib/types';
import type { RolesPost, RolesPatch } from '@/lib/database.types';

export const rolesApi = {
  /**
   * Get all roles
   */
  async getAll(): Promise<Role[]> {
    return api.get<Role[]>(`${API_URL}/roles?select=*&order=is_system.desc,name.asc`);
  },

  /**
   * Create a new role
   */
  async create(data: RolesPost): Promise<Role> {
    const [role] = await api.post<Role[]>(`${API_URL}/roles`, data, { prefer: 'return=representation' });
    return role;
  },

  /**
   * Update a role
   */
  async update(id: string, data: RolesPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/roles?id=eq.${id}`, data, { prefer: 'return=minimal' });
  },

  /**
   * Update levels for multiple roles
   */
  async updateLevels(updates: { id: string; level: number }[]): Promise<void> {
    const headers = await getHeaders('return=minimal');
    await Promise.all(
      updates.map(({ id, level }) =>
        fetch(`${API_URL}/roles?id=eq.${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ level }),
        }).then((r) => { if (!r.ok) throw new Error('Failed to update level'); })
      )
    );
  },

  /**
   * Delete a role
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/roles?id=eq.${id}`);
  },

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return api.get<Permission[]>(`${API_URL}/permissions?select=*&order=key.asc`);
  },

  /**
   * Get permission IDs assigned to a specific role
   */
  async getRolePermissionIds(roleId: string): Promise<string[]> {
    const rows = await api.get<{ permission_id: string }[]>(
      `${API_URL}/role_permissions?select=permission_id&role_id=eq.${roleId}`
    );
    return rows.map((r) => r.permission_id);
  },

  /**
   * Replace all permissions for a role (admin only, via RPC)
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_set_role_permissions`, {
      p_role_id: roleId,
      p_permission_ids: permissionIds,
    });
  },
};
