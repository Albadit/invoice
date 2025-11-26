import type { Database } from '@/supabase/database.types';

// Base types from Supabase
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type Currency = Database['public']['Tables']['currencies']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];

// Extended types
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  currency: Currency;
  company: Company;
}

// Status type
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

// Amount type for discount, tax, shipping
export type AmountType = 'percent' | 'fixed';
