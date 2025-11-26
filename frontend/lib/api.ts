/**
 * Supabase REST API helper functions
 * Uses the fetch wrapper from @/lib/fetch for API calls
 */

import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceWithItems, 
  Currency, 
  Template,
  Company
} from '@/lib/types';
import type { 
  InvoicesPost,
  InvoicesPatch,
  CurrenciesPost,
  CurrenciesPatch,
  TemplatesPost,
  TemplatesPatch,
  CompaniesPost,
  CompaniesPatch
} from '@/supabase/database.types';

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`
  : 'http://127.0.0.1:54321/rest/v1';
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Common headers for API requests
 */
function getHeaders(prefer?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };
  
  if (prefer) {
    headers['Prefer'] = prefer;
  }
  
  return headers;
}

/**
 * Invoice API functions
 */
export const invoicesApi = {
  /**
   * Get all invoices with their items
   */
  async getAll(): Promise<InvoiceWithItems[]> {
    const response = await fetch(
      `${API_URL}/invoices?select=*,invoice_items(*),currencies(*),companies(*)&order=created_at.desc`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    
    const data = await response.json();
    return data.map((invoice: any) => {
      const { invoice_items, currencies, companies, ...rest } = invoice;
      return {
        ...rest,
        items: invoice_items || [],
        currency: currencies || null,
        company: companies || null
      };
    });
  },

  /**
   * Get invoice by ID with items
   */
  async getById(id: string): Promise<InvoiceWithItems> {
    const response = await fetch(
      `${API_URL}/invoices?id=eq.${id}&select=*,invoice_items(*),currencies(*),companies(*)`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = data[0];
    const { invoice_items, currencies, companies, ...rest } = invoice;
    return {
      ...rest,
      items: invoice_items || [],
      currency: currencies || null,
      company: companies || null
    };
  },

  /**
   * Create a new invoice with items
   */
  async create(
    invoiceData: InvoicesPost,
    items: Partial<InvoiceItem>[]
  ): Promise<Invoice> {
    // Create invoice
    const invoiceResponse = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: getHeaders('return=representation'),
      body: JSON.stringify(invoiceData)
    });
    
    if (!invoiceResponse.ok) {
      throw new Error('Failed to create invoice');
    }
    
    const [newInvoice] = await invoiceResponse.json();
    
    // Create invoice items
    if (items && items.length > 0) {
      const itemsData = items.map((item, index) => ({
        invoice_id: newInvoice.id,
        name: item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        sort_order: index
      }));
      
      console.log('Creating invoice items:', itemsData);
      
      const itemsResponse = await fetch(`${API_URL}/invoice_items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemsData)
      });
      
      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        console.error('Failed to create invoice items:', errorText);
        throw new Error('Failed to create invoice items');
      }
    }
    
    return newInvoice;
  },

  /**
   * Update an invoice and its items
   */
  async update(
    id: string,
    invoiceData: InvoicesPatch,
    items?: Partial<InvoiceItem>[]
  ): Promise<void> {
    // Update invoice
    const updateResponse = await fetch(`${API_URL}/invoices?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify(invoiceData)
    });
    
    if (!updateResponse.ok) {
      throw new Error('Failed to update invoice');
    }
    
    // Update items if provided
    if (items) {
      // Delete existing items
      const deleteResponse = await fetch(`${API_URL}/invoice_items?invoice_id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      if (!deleteResponse.ok) {
        console.error('Failed to delete existing items');
      }
      
      // Create new items
      if (items.length > 0) {
        const itemsData = items.map((item, index) => ({
          invoice_id: id,
          name: item.name || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          sort_order: index
        }));
        
        console.log('Updating invoice items:', itemsData);
        
        const itemsResponse = await fetch(`${API_URL}/invoice_items`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(itemsData)
        });
        
        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text();
          console.error('Failed to create invoice items:', errorText);
          throw new Error('Failed to update invoice items');
        }
      }
    }
  },

  /**
   * Delete an invoice
   */
  async delete(id: string): Promise<void> {
    // Delete invoice items first
    await fetch(`${API_URL}/invoice_items?invoice_id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    // Delete invoice
    const response = await fetch(`${API_URL}/invoices?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete invoice');
    }
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    const response = await fetch(`${API_URL}/invoices?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update invoice status');
    }
  }
};

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
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `logos/${fileName}`;
    
    // Upload file using Supabase client
    const { data, error } = await supabase.storage
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
    const { createClient } = await import('@/lib/supabase');
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
    const { createClient } = await import('@/lib/supabase');
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
