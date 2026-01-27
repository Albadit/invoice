/**
 * Invoice feature API functions
 */

import { API_URL, getHeaders } from '@/lib/api';
import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceWithItems 
} from '@/lib/types';
import type { 
  InvoicesPost,
  InvoicesPatch
} from '@/lib/database.types';

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
    return data.map((invoice: Record<string, unknown>) => {
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
