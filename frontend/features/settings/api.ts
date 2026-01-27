/**
 * Settings feature API functions
 * Handles currencies, templates, companies, and storage
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { 
  Currency, 
  Template,
  Company
} from '@/lib/types';
import type { 
  CurrenciesPost,
  CurrenciesPatch,
  TemplatesPost,
  TemplatesPatch,
  CompaniesPost,
  CompaniesPatch
} from '@/lib/database.types';

/**
 * Currency API functions
 */
export const currenciesApi = {
  /**
   * Get all currencies
   */
  async getAll(): Promise<Currency[]> {
    const response = await fetch(
      `${API_URL}/currencies?select=*&order=code.asc`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }
    
    return response.json();
  },

  /**
   * Create a new currency
   */
  async create(currencyData: CurrenciesPost): Promise<Currency> {
    const response = await fetch(`${API_URL}/currencies`, {
      method: 'POST',
      headers: getHeaders('return=representation'),
      body: JSON.stringify(currencyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create currency');
    }
    
    const [newCurrency] = await response.json();
    return newCurrency;
  },

  /**
   * Update a currency
   */
  async update(id: string, currencyData: CurrenciesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/currencies?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify(currencyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update currency');
    }
  },

  /**
   * Delete a currency
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/currencies?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete currency');
    }
  }
};

/**
 * Templates API functions
 */
export const templatesApi = {
  /**
   * Get all templates
   */
  async getAll(): Promise<Template[]> {
    const response = await fetch(
      `${API_URL}/templates?select=*&order=name.asc`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return response.json();
  },

  /**
   * Create a new template
   */
  async create(templateData: TemplatesPost): Promise<Template> {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: getHeaders('return=representation'),
      body: JSON.stringify(templateData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    const [newTemplate] = await response.json();
    return newTemplate;
  },

  /**
   * Update a template
   */
  async update(id: string, templateData: TemplatesPatch): Promise<void> {
    const response = await fetch(`${API_URL}/templates?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify(templateData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update template');
    }
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<Template> {
    const response = await fetch(
      `${API_URL}/templates?id=eq.${id}&select=*`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Template not found');
    }
    
    return data[0];
  },

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/templates?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  }
};

/**
 * Storage API functions for file uploads
 */
export const storageApi = {
  /**
   * Upload a file to the logo bucket
   */
  async uploadLogo(file: File): Promise<string> {
    // Dynamic import to avoid server-side issues
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `logos/${fileName}`;
    
    // Upload file using Supabase client
    const { error } = await supabase.storage
      .from('logo')
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
      .from('logo')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  },

  /**
   * Get public URL for a logo
   */
  async getLogoUrl(path: string): Promise<string> {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    const { data } = supabase.storage
      .from('logo')
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  /**
   * Delete a logo from storage
   */
  async deleteLogo(path: string): Promise<void> {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    const { error } = await supabase.storage
      .from('logo')
      .remove([path]);
    
    if (error) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete logo');
    }
  }
};

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
      { headers: getHeaders() }
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
      { headers: getHeaders() }
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
      headers: getHeaders('return=representation'),
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
      headers: getHeaders()
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
      headers: getHeaders('return=minimal'),
      body: JSON.stringify(companyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update company');
    }
  }
};
