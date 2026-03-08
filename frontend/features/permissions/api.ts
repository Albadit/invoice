/**
 * Permissions feature API functions
 * CRUD for permissions table via RPC
 */

import api, { API_URL } from '@/lib/api/api';
import type { Permission } from '@/lib/types';

export const permissionsApi = {
  /**
   * Get all permissions
   */
  async getAll(): Promise<Permission[]> {
    return api.get<Permission[]>(`${API_URL}/permissions?select=*&order=key.asc`);
  },

  /**
   * Create a new permission via RPC
   */
  async create(data: { key: string; description: string | null; route: string | null }): Promise<string> {
    return api.post<string>(`${API_URL}/rpc/admin_create_permission`, {
      p_key: data.key,
      p_description: data.description,
      p_route: data.route,
    });
  },

  /**
   * Update a permission via RPC
   */
  async update(id: string, data: { key: string; description: string | null; route: string | null }): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_update_permission`, {
      p_id: id,
      p_key: data.key,
      p_description: data.description,
      p_route: data.route,
    });
  },

  /**
   * Delete a permission via RPC
   */
  async delete(id: string): Promise<void> {
    await api.post<void>(`${API_URL}/rpc/admin_delete_permission`, {
      p_id: id,
    });
  },
};
