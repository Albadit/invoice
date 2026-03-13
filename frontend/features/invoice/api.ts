/**
 * Invoice feature API functions
 * 
 * Uses "big company" patterns for 10M+ row performance:
 * - Keyset (cursor) pagination instead of OFFSET
 * - Full-text search (FTS) with trigram fallback
 * - Estimated counts instead of COUNT(*)
 */

import api, { API_URL } from '@/lib/api/api';
import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceWithItems,
  PaginatedResponse,
  CursorPaginatedResponse,
  PageCursor,
} from '@/lib/types';
import type { 
  InvoicesPost,
  InvoicesPatch
} from '@/lib/database.types';

import { DEFAULT_API_PAGE_SIZE } from '@/config/constants';

export type { PaginatedResponse, CursorPaginatedResponse, PageCursor };

/**
 * Invoice list columns (only what's needed for the table view)
 */
const LIST_COLUMNS = 'id,invoice_code,customer_name,status,issue_date,due_date,total_amount,currency_id,created_at,currencies(symbol,code,symbol_position,symbol_space)';

/**
 * Map raw invoice row (with embedded currencies) to InvoiceWithItems shape
 */
function mapInvoiceRow(invoice: Record<string, unknown>) {
  const { currencies, ...rest } = invoice;
  const curr = currencies as { symbol?: string; code?: string; symbol_position?: string; symbol_space?: boolean } | null;
  return {
    ...rest,
    items: [],
    currency: curr ? { symbol: curr.symbol, code: curr.code, symbol_position: curr.symbol_position, symbol_space: curr.symbol_space } : null,
    company: null,
  } as unknown as InvoiceWithItems;
}

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
   */
  async getAllWithCursor(options?: {
    limit?: number;
    cursor?: PageCursor | null;
    status?: 'active' | 'cancelled';
    search?: string;
    statusFilter?: string[];
    startDate?: string;
    endDate?: string;
    signal?: AbortSignal;
  }): Promise<CursorPaginatedResponse<InvoiceWithItems>> {
    const { 
      limit = DEFAULT_API_PAGE_SIZE, 
      cursor = null,
      status = 'active', 
      search, 
      statusFilter, 
      startDate, 
      endDate, 
      signal 
    } = options || {};
    
    const url = new URL(`${API_URL}/invoices`);
    url.searchParams.set('select', LIST_COLUMNS);
    url.searchParams.set('order', 'created_at.desc,id.desc');
    url.searchParams.set('limit', String(limit + 1));
    
    if (status === 'cancelled') {
      url.searchParams.append('status', 'eq.cancelled');
    } else {
      url.searchParams.append('status', 'neq.cancelled');
    }
    
    if (statusFilter && statusFilter.length > 0) {
      url.searchParams.append('status', statusFilter.length === 1
        ? `eq.${statusFilter[0]}`
        : `in.(${statusFilter.join(',')})`);
    }
    
    if (search) {
      const t = search.trim();
      url.searchParams.append('or', `(search_tsv.wfts.${encodeURIComponent(t)},search_text.ilike.*${encodeURIComponent(t)}*)`);
    }
    
    if (startDate) url.searchParams.append('issue_date', `gte.${startDate}`);
    if (endDate) url.searchParams.append('issue_date', `lte.${endDate}`);
    
    if (cursor) {
      url.searchParams.append('or', `(created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}))`);
    }
    
    const prefer = cursor ? undefined : 'count=exact';
    const response = await api.getRaw(url.toString(), { prefer, signal });
    
    let estimatedTotal = 0;
    if (!cursor) {
      const contentRange = response.headers.get('Content-Range');
      estimatedTotal = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    }
    
    const data = await response.json();
    const hasNext = data.length > limit;
    const pageData = hasNext ? data.slice(0, limit) : data;
    
    const lastRow = pageData[pageData.length - 1];
    const nextCursor: PageCursor | null = hasNext && lastRow
      ? { createdAt: lastRow.created_at, id: lastRow.id }
      : null;
    
    return { 
      data: pageData.map(mapInvoiceRow), 
      nextCursor, 
      hasNext,
      estimatedTotal,
    };
  },

  /**
   * Get all invoices (paginated with offset-based pagination)
   */
  async getAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    statusFilter?: string[];
    companyIds?: string[];
    startDate?: string;
    endDate?: string;
    orderBy?: string;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<InvoiceWithItems>> {
    const { 
      limit = 10, 
      offset = 0,
      search, 
      statusFilter, 
      companyIds,
      startDate, 
      endDate,
      orderBy,
      signal 
    } = options || {};
    
    const url = new URL(`${API_URL}/invoices`);
    url.searchParams.set('select', LIST_COLUMNS);
    url.searchParams.set('order', orderBy || 'created_at.desc,id.desc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    
    if (statusFilter && statusFilter.length > 0) {
      url.searchParams.append('status', statusFilter.length === 1
        ? `eq.${statusFilter[0]}`
        : `in.(${statusFilter.join(',')})`);
    }
    
    if (companyIds && companyIds.length > 0) {
      url.searchParams.append('company_id', companyIds.length === 1
        ? `eq.${companyIds[0]}`
        : `in.(${companyIds.join(',')})`);
    }
    
    if (search) {
      const t = search.trim();
      url.searchParams.append('or', `(search_tsv.wfts.${encodeURIComponent(t)},search_text.ilike.*${encodeURIComponent(t)}*)`);
    }
    
    if (startDate) url.searchParams.append('issue_date', `gte.${startDate}`);
    if (endDate) url.searchParams.append('issue_date', `lte.${endDate}`);
    
    const response = await api.getRaw(url.toString(), { prefer: 'count=exact', signal });
    
    const contentRange = response.headers.get('Content-Range');
    const totalCount = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    
    const data = await response.json();
    return { data: data.map(mapInvoiceRow), totalCount };
  },

  /**
   * Get invoice by ID with items
   */
  async getById(id: string, authToken?: string): Promise<InvoiceWithItems> {
    const data = await api.get<Record<string, unknown>[]>(
      `${API_URL}/invoices?id=eq.${id}&select=*,invoice_items(*),currencies(*),companies(*),clients(*)`,
      { authToken }
    );
    
    if (!data || data.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = data[0];
    const { invoice_items, currencies, companies, clients, ...rest } = invoice;
    return {
      ...rest,
      items: (invoice_items as InvoiceItem[]) || [],
      currency: currencies || null,
      company: companies || null,
      client: clients || null,
    } as InvoiceWithItems;
  },

  /**
   * Create a new invoice with items
   */
  async create(
    invoiceData: InvoicesPost,
    items: Partial<InvoiceItem>[]
  ): Promise<Invoice> {
    const [newInvoice] = await api.post<Invoice[]>(
      `${API_URL}/invoices`, invoiceData, { prefer: 'return=representation' }
    );
    
    if (items && items.length > 0) {
      const itemsData = items.map((item, index) => ({
        invoice_id: newInvoice.id,
        name: item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        sort_order: index,
      }));
      
      await api.post<void>(`${API_URL}/invoice_items`, itemsData);
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
    await api.patch<void>(`${API_URL}/invoices?id=eq.${id}`, invoiceData, { prefer: 'return=minimal' });
    
    if (items) {
      await api.delete<void>(`${API_URL}/invoice_items?invoice_id=eq.${id}`);
      
      if (items.length > 0) {
        const itemsData = items.map((item, index) => ({
          invoice_id: id,
          name: item.name || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          sort_order: index,
        }));
        
        await api.post<void>(`${API_URL}/invoice_items`, itemsData);
      }
    }
  },

  /**
   * Delete an invoice
   */
  async delete(id: string): Promise<void> {
    await api.delete<void>(`${API_URL}/invoice_items?invoice_id=eq.${id}`);
    await api.delete<void>(`${API_URL}/invoices?id=eq.${id}`);
  },

  /**
   * Delete multiple invoices by IDs
   */
  async deleteMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const list = ids.map(id => encodeURIComponent(id)).join(',');
    await api.delete<void>(`${API_URL}/invoice_items?invoice_id=in.(${list})`);
    await api.delete<void>(`${API_URL}/invoices?id=in.(${list})`);
  },

  /**
   * Update status for multiple invoices
   */
  async updateStatusMany(ids: string[], status: string): Promise<void> {
    if (!ids.length) return;
    const list = ids.map(id => encodeURIComponent(id)).join(',');
    await api.patch<void>(`${API_URL}/invoices?id=in.(${list})`, { status }, { prefer: 'return=minimal' });
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await api.patch<void>(`${API_URL}/invoices?id=eq.${id}`, { status }, { prefer: 'return=minimal' });
  },

  /**
   * Get all invoices with minimal fields for dashboard stats.
   */
  async getStats(companyId?: string): Promise<{
    status: string;
    total_amount: number | null;
    currency_id: string;
    exchange_rate: number;
    issue_date: string | null;
    due_date: string | null;
    company_id: string;
  }[]> {
    let url = `${API_URL}/invoices?select=status,total_amount,currency_id,exchange_rate,issue_date,due_date,company_id`;
    if (companyId) url += `&company_id=eq.${companyId}`;
    return api.get(url);
  },
};
