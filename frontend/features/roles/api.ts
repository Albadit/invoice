/**
 * Roles feature API functions
 * CRUD for roles table + RPC for role_permissions management
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { Role, Permission } from '@/lib/types';
import type { RolesPost, RolesPatch } from '@/lib/database.types';

export const rolesApi = {
  /**
   * Get all roles
   */
  async getAll(): Promise<Role[]> {
    const response = await fetch(
      `${API_URL}/roles?select=*&order=is_system.desc,name.asc`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json();
  },

  /**
   * Create a new role
   */
  async create(data: RolesPost): Promise<Role> {
    const response = await fetch(`${API_URL}/roles`, {
      method: 'POST',
      headers: await getHeaders('return=representation'),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create role');
    }

    const [role] = await response.json();
    return role;
  },

  /**
   * Update a role
   */
  async update(id: string, data: RolesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/roles?id=eq.${id}`, {
      method: 'PATCH',
      headers: await getHeaders('return=minimal'),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update role');
    }
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
    const response = await fetch(`${API_URL}/roles?id=eq.${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete role');
    }
  },

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const response = await fetch(
      `${API_URL}/permissions?select=*&order=key.asc`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }

    return response.json();
  },

  /**
   * Get permission IDs assigned to a specific role
   */
  async getRolePermissionIds(roleId: string): Promise<string[]> {
    const response = await fetch(
      `${API_URL}/role_permissions?select=permission_id&role_id=eq.${roleId}`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch role permissions');
    }

    const rows: { permission_id: string }[] = await response.json();
    return rows.map((r) => r.permission_id);
  },

  /**
   * Replace all permissions for a role (admin only, via RPC)
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/rpc/admin_set_role_permissions`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({
        p_role_id: roleId,
        p_permission_ids: permissionIds,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update role permissions');
    }
  },
};
