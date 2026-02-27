/**
 * Clients feature API functions
 * Handles CRUD operations for client records (record linking)
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { Client, PaginatedResponse } from '@/lib/types';
import type {
  ClientsPost,
  ClientsPatch
} from '@/lib/database.types';

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
      limit = 50,
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

    const response = await fetch(url.toString(), {
      headers: await getHeaders('count=exact'),
      signal
    });

    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }

    const contentRange = response.headers.get('Content-Range');
    const totalCount = contentRange ? parseInt(contentRange.split('/')[1]) : 0;

    const data = await response.json();
    return { data, totalCount };
  },

  /**
   * Get all clients as a simple list (for dropdowns)
   */
  async list(): Promise<Client[]> {
    const response = await fetch(
      `${API_URL}/clients?select=*&order=name.asc`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }

    return response.json();
  },

  /**
   * Get a client by ID
   */
  async getById(id: string): Promise<Client> {
    const response = await fetch(
      `${API_URL}/clients?id=eq.${id}&select=*`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch client');
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Client not found');
    }

    return data[0];
  },

  /**
   * Get clients by company ID
   */
  async getByCompany(companyId: string): Promise<Client[]> {
    const response = await fetch(
      `${API_URL}/clients?company_id=eq.${companyId}&select=*&order=name.asc`,
      { headers: await getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch clients for company');
    }

    return response.json();
  },

  /**
   * Create a new client
   */
  async create(clientData: ClientsPost): Promise<Client> {
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: await getHeaders('return=representation'),
      body: JSON.stringify(clientData)
    });

    if (!response.ok) {
      throw new Error('Failed to create client');
    }

    const [newClient] = await response.json();
    return newClient;
  },

  /**
   * Update a client
   */
  async update(id: string, clientData: ClientsPatch): Promise<void> {
    const response = await fetch(`${API_URL}/clients?id=eq.${id}`, {
      method: 'PATCH',
      headers: await getHeaders('return=minimal'),
      body: JSON.stringify(clientData)
    });

    if (!response.ok) {
      throw new Error('Failed to update client');
    }
  },

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/clients?id=eq.${id}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete client');
    }
  }
};
