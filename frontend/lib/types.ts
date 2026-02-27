import type { Database } from '@/lib/database.types';

// Base types from Supabase
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type Currency = Database['public']['Tables']['currencies']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];

// Extended types
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  currency: Currency;
  company: Company;
  client?: Client | null;
}

// Status type
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

// Amount type for discount, tax, shipping
export type AmountType = 'percent' | 'fixed';

// ── Shared pagination types ────────────────────────────────────────

/** Offset-based paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

/** Cursor (keyset) paginated response */
export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: PageCursor | null;
  hasNext: boolean;
  estimatedTotal: number;
}

/** Cursor for keyset pagination (sort values of last row) */
export interface PageCursor {
  createdAt: string;
  id: string;
}

/** Lightweight stat row returned by `invoicesApi.getStats()` */
export type InvoiceStat = {
  status: string;
  total_amount: number | null;
  currency_id: string;
  issue_date: string | null;
  due_date: string | null;
};

/** Canonical colour palette for invoice statuses (used in charts, badges, etc.) */
export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: '#f5a524',
  paid: '#17c964',
  overdue: '#f31260',
  cancelled: '#889096',
};

/**
 * Get the effective display status for an invoice.
 * If the stored status is 'pending' and the due_date is in the past, returns 'overdue'.
 */
export function getEffectiveStatus(
  status: InvoiceStatus,
  dueDate?: string | null
): InvoiceStatus {
  if (status === 'pending' && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return status;
}
