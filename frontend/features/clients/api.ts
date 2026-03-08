/**
 * Clients feature API functions
 * Handles CRUD operations for client records (record linking)
 */

import api, { API_URL } from '@/lib/api/api';
import type { Client, PaginatedResponse } from '@/lib/types';
import type {
  ClientsPost,
  ClientsPatch
} from '@/lib/database.types';

import { DEFAULT_API_PAGE_SIZE } from '@/config/constants';

export type { PaginatedResponse };

/**
 * Client API functions
 */
export const clientsApi = {
  /**
   * Get all clients (paginated, searchable)
   */
  async getAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    companyId?: string;
    orderBy?: string;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<Client>> {
    const {
      limit = DEFAULT_API_PAGE_SIZE,
      offset = 0,
      search,
      companyId,
      orderBy,
      signal
    } = options || {};

    const url = new URL(`${API_URL}/clients`);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', orderBy || 'name.asc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    if (search) {
      const term = search.trim();
      url.searchParams.append(
        'or',
        `(name.ilike.*${encodeURIComponent(term)}*,email.ilike.*${encodeURIComponent(term)}*,tax_id.ilike.*${encodeURIComponent(term)}*)`
      );
    }

    if (companyId) {
      url.searchParams.append('company_id', `eq.${companyId}`);
    }

    const response = await api.getRaw(url.toString(), { prefer: 'count=exact', signal });

    const contentRange = response.headers.get('Content-Range');
    const totalCount = contentRange ? parseInt(contentRange.split('/')[1]) : 0;

    const data = await response.json();
    return { data, totalCount };
  },

  /**
   * Get all clients as a simple list (for dropdowns)
   */
  async list(): Promise<Client[]> {
    return api.get<Client[]>(`${API_URL}/clients?select=*&order=name.asc`);
  },

  /**
   * Get a client by ID
   */
  async getById(id: string): Promise<Client> {
    const data = await api.get<Client[]>(`${API_URL}/clients?id=eq.${id}&select=*`);
    if (!data || data.length === 0) {
      throw new Error('Client not found');
    }
    return data[0];
  },

  /**
   * Get clients by company ID
   */
  async getByCompany(companyId: string): Promise<Client[]> {
    return api.get<Client[]>(`${API_URL}/clients?company_id=eq.${companyId}&select=*&order=name.asc`);
  },

  /**
   * Create a new client
   */
  async create(clientData: ClientsPost): Promise<Client> {
    const [newClient] = await api.post<Client[]>(`${API_URL}/clients`, clientData, { prefer: 'return=representation' });
    return newClient;
  },

  /**
   * Update a client
   */
  async update(id: string, clientData: ClientsPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/clients?id=eq.${id}`, clientData, { prefer: 'return=minimal' });
  },

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/clients?id=eq.${id}`);
  }
};
