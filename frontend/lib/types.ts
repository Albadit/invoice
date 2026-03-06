import type { Database, StatusType, AmountType as AmountTypes } from '@/lib/database.types';

// Base types from Supabase
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type Currency = Database['public']['Tables']['currencies']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];

// RBAC types
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];

// Admin types
export type { AdminUser } from '@/lib/database.types';

// Extended types
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  currency: Currency;
  company: Company;
  client?: Client | null;
}

// Status type
export type InvoiceStatus = StatusType;

// Amount type for discount, tax, shipping
export type AmountType = AmountTypes;

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
