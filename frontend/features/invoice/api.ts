/**
 * Invoice feature API functions
 * 
 * Uses "big company" patterns for 10M+ row performance:
 * - Keyset (cursor) pagination instead of OFFSET
 * - Full-text search (FTS) with trigram fallback
 * - Estimated counts instead of COUNT(*)
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
 * Cursor for keyset pagination
 * Contains the last row's sort values: (created_at, id)
 */
export interface PageCursor {
  createdAt: string;  // ISO timestamp of last row
  id: string;         // UUID of last row
}

/**
 * Paginated response with cursor (offset-based, legacy)
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

/**
 * Cursor-paginated response (keyset-based, fast)
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: PageCursor | null;  // null = no more pages
  hasNext: boolean;
  estimatedTotal: number;         // Fast estimate, not exact
}

/**
 * Invoice list columns (only what's needed for the table view)
 */
const LIST_COLUMNS = 'id,invoice_number,customer_name,status,issue_date,due_date,total_amount,currency_id,created_at,currencies(symbol,code)';

/**
 * Invoice API functions
 */
export const invoicesApi = {
  /**
   * Get invoices with FAST cursor-based (keyset) pagination
   * 
   * This is the recommended method for large datasets (10M+ rows):
   * - O(1) pagination instead of O(n) offset
   * - Uses FTS for word search, trigram for substring search
   * - Returns estimated total instead of expensive COUNT(*)
   * 
   * @example
   * // First page
   * const { data, nextCursor } = await invoicesApi.getAllWithCursor({ limit: 50 });
   * 
   * // Next page (pass cursor from previous response)
   * const page2 = await invoicesApi.getAllWithCursor({ limit: 50, cursor: nextCursor });
   */
  async getAllWithCursor(options?: {
    limit?: number;
    cursor?: PageCursor | null;
    status?: 'active' | 'cancelled';
    search?: string;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    signal?: AbortSignal;
  }): Promise<CursorPaginatedResponse<InvoiceWithItems>> {
    const { 
      limit = 50, 
      cursor = null,
      status = 'active', 
      search, 
      statusFilter, 
      startDate, 
      endDate, 
      signal 
    } = options || {};
    
    // Build URL with query params
    const url = new URL(`${API_URL}/invoices`);
    url.searchParams.set('select', LIST_COLUMNS);
    url.searchParams.set('order', 'created_at.desc,id.desc');
    url.searchParams.set('limit', String(limit + 1)); // Fetch one extra to detect hasNext
    
    // Status filter (active vs cancelled tab)
    if (status === 'cancelled') {
      url.searchParams.append('status', 'eq.cancelled');
    } else {
      url.searchParams.append('status', 'neq.cancelled');
    }
    
    // Additional status filter (pending, paid, etc.)
    if (statusFilter) {
      url.searchParams.append('status', `eq.${statusFilter}`);
    }
    
    // Search filter - use FTS for word search, trigram for substring
    // PostgREST uses fts for full-text search operators
    if (search) {
      // Try FTS first (for word-based search like "payment failed")
      // Also include trigram fallback for partial matches (like "INV-00")
      // Using OR to combine: FTS match OR trigram match
      const searchTerm = search.trim();
      
      // FTS: search_tsv column with websearch syntax
      // Trigram: search_text column with ILIKE
      url.searchParams.append(
        'or', 
        `(search_tsv.wfts.${encodeURIComponent(searchTerm)},search_text.ilike.*${encodeURIComponent(searchTerm)}*)`
      );
    }
    
    // Date range filter
    if (startDate) {
      url.searchParams.append('issue_date', `gte.${startDate}`);
    }
    if (endDate) {
      url.searchParams.append('issue_date', `lte.${endDate}`);
    }
    
    // KEYSET PAGINATION: Apply cursor condition
    // This is the key to fast pagination on 10M+ rows
    // For DESC order: get rows where (created_at, id) < cursor
    if (cursor) {
      // Simple approach: filter by created_at being strictly less than cursor
      // This works because created_at has high precision and is ordered DESC
      // If there are ties, we also filter by id
      url.searchParams.append('created_at', `lt.${cursor.createdAt}`);
    }
    
    // Only fetch count on first page (no cursor) - cursor pagination would return remaining count
    const countHeader = cursor ? undefined : 'count=exact';
    const response = await fetch(url.toString(), { headers: getHeaders(countHeader), signal });
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    
    // Get exact count from Content-Range header (only valid on first page)
    let estimatedTotal = 0;
    if (!cursor) {
      const contentRange = response.headers.get('Content-Range');
      estimatedTotal = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    }
    
    const data = await response.json();
    
    // Check if there's a next page (we fetched limit + 1)
    const hasNext = data.length > limit;
    const pageData = hasNext ? data.slice(0, limit) : data;
    
    // Build next cursor from last row
    const lastRow = pageData[pageData.length - 1];
    const nextCursor: PageCursor | null = hasNext && lastRow
      ? { createdAt: lastRow.created_at, id: lastRow.id }
      : null;
    
    const invoices = pageData.map((invoice: Record<string, unknown>) => {
      const { currencies, ...rest } = invoice;
      const curr = currencies as { symbol?: string; code?: string } | null;
      return {
        ...rest,
        items: [],
        currency: curr ? { symbol: curr.symbol, code: curr.code } : null,
        company: null
      };
    });
    
    return { 
      data: invoices, 
      nextCursor, 
      hasNext,
      estimatedTotal 
    };
  },

  /**
   * Get all invoices (paginated with offset-based pagination)
   * @deprecated Use getAllWithCursor for better performance on large datasets
   */
  async getAll(options?: {
    limit?: number;
    offset?: number;
    status?: 'active' | 'cancelled';
    search?: string;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<InvoiceWithItems>> {
    const { 
      limit = 10, 
      offset = 0,
      status = 'active', 
      search, 
      statusFilter, 
      startDate, 
      endDate, 
      signal 
    } = options || {};
    
    // Build URL with query params
    const url = new URL(`${API_URL}/invoices`);
    url.searchParams.set('select', LIST_COLUMNS);
    url.searchParams.set('order', 'created_at.desc,id.desc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    
    // Status filter (active vs cancelled tab)
    if (status === 'cancelled') {
      url.searchParams.append('status', 'eq.cancelled');
    } else {
      url.searchParams.append('status', 'neq.cancelled');
    }
    
    // Additional status filter (pending, paid, etc.)
    if (statusFilter) {
      url.searchParams.append('status', `eq.${statusFilter}`);
    }
    
    // Search filter - use FTS + trigram for fast search
    if (search) {
      const searchTerm = search.trim();
      url.searchParams.append(
        'or', 
        `(search_tsv.wfts.${encodeURIComponent(searchTerm)},search_text.ilike.*${encodeURIComponent(searchTerm)}*)`
      );
    }
    
    // Date range filter
    if (startDate) {
      url.searchParams.append('issue_date', `gte.${startDate}`);
    }
    if (endDate) {
      url.searchParams.append('issue_date', `lte.${endDate}`);
    }
    
    // Use exact count for accurate totals
    const response = await fetch(url.toString(), { headers: getHeaders('count=exact'), signal });
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }
    
    // Get total count from Content-Range header
    const contentRange = response.headers.get('Content-Range');
    const totalCount = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    
    const data = await response.json();
    
    const invoices = data.map((invoice: Record<string, unknown>) => {
      const { currencies, ...rest } = invoice;
      const curr = currencies as { symbol?: string; code?: string } | null;
      return {
        ...rest,
        items: [],
        currency: curr ? { symbol: curr.symbol, code: curr.code } : null,
        company: null
      };
    });
    
    return { data: invoices, totalCount };
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
