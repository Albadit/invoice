/**
 * Companies feature API functions
 */

import api, { API_URL } from '@/lib/api/api';
import type { Company } from '@/lib/types';
import type { CompaniesPost, CompaniesPatch } from '@/lib/database.types';

/**
 * Companies API functions
 */
export const companiesApi = {
  /**
   * Get all companies
   */
  async getAll(): Promise<Company[]> {
    return api.get<Company[]>(`${API_URL}/companies?select=*&order=name.asc`);
  },

  /**
   * Get company by ID
   */
  async getById(id: string): Promise<Company> {
    const data = await api.get<Company[]>(`${API_URL}/companies?id=eq.${id}&select=*`);
    if (!data || data.length === 0) {
      throw new Error('Company not found');
    }
    return data[0];
  },

  /**
   * Create a new company
   */
  async create(companyData: CompaniesPost): Promise<Company> {
    const [newCompany] = await api.post<Company[]>(`${API_URL}/companies`, companyData, { prefer: 'return=representation' });
    return newCompany;
  },

  /**
   * Delete a company
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/companies?id=eq.${id}`);
  },

  /**
   * Update a company
   */
  async update(id: string, companyData: CompaniesPatch): Promise<void> {
    await api.patch<void>(`${API_URL}/companies?id=eq.${id}`, companyData, { prefer: 'return=minimal' });
  }
};

/**
 * Storage API functions for company logo uploads.
 * Routes through /api/storage/logo so the client never touches Supabase directly.
 */
export const storageApi = {
  /**
   * Upload a file to the logo bucket
   */
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/storage/logo', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to upload logo');
    }

    const { publicUrl } = await res.json();
    return publicUrl;
  },

  /**
   * Delete a logo from storage
   */
  async deleteLogo(path: string): Promise<void> {
    const res = await fetch('/api/storage/logo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to delete logo');
    }
  }
};
