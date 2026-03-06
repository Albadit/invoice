/**
 * Companies feature API functions
 */

import { API_URL, getHeaders } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
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
    const response = await fetch(
      `${API_URL}/companies?select=*&order=name.asc`,
      { headers: await getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }
    
    return response.json();
  },

  /**
   * Get company by ID
   */
  async getById(id: string): Promise<Company> {
    const response = await fetch(
      `${API_URL}/companies?id=eq.${id}&select=*`,
      { headers: await getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch company');
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Company not found');
    }
    
    return data[0];
  },

  /**
   * Create a new company
   */
  async create(companyData: CompaniesPost): Promise<Company> {
    const response = await fetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: await getHeaders('return=representation'),
      body: JSON.stringify(companyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create company');
    }
    
    const [newCompany] = await response.json();
    return newCompany;
  },

  /**
   * Delete a company
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/companies?id=eq.${id}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete company');
    }
  },

  /**
   * Update a company
   */
  async update(id: string, companyData: CompaniesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/companies?id=eq.${id}`, {
      method: 'PATCH',
      headers: await getHeaders('return=minimal'),
      body: JSON.stringify(companyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update company');
    }
  }
};

/**
 * Storage API functions for company logo uploads
 */
export const storageApi = {
  /**
   * Upload a file to the logo bucket
   */
  async uploadLogo(file: File): Promise<string> {
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = fileName;
    
    // Upload file using Supabase client
    const { error } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload logo');
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  },

  /**
   * Delete a logo from storage
   */
  async deleteLogo(path: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase.storage
      .from('logos')
      .remove([path]);
    
    if (error) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete logo');
    }
  }
};
