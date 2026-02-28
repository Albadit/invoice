import type { InvoiceWithItems } from '@/lib/types';

/**
 * Dummy invoice used by the template editor preview.
 *
 * The `company` and `currency` fields are placeholders that get
 * overridden at runtime with the selected company / currency data.
 * Add more items or adjust values here to enrich the preview.
 */
export const DUMMY_INVOICE: InvoiceWithItems = {
  // ── Identity ─────────────────────────────────────────────────────
  id: 'dummy-preview',
  user_id: 'dummy-user',
  company_id: 'dummy-company',
  currency_id: 'dummy-currency',
  template_id: null,
  client_id: null,
  invoice_code: 'INV-2026-001',

  // ── Status ───────────────────────────────────────────────────────
  status: 'pending',

  // ── Customer ─────────────────────────────────────────────────────
  customer_name: 'Jane Smith',
  customer_street: '456 Oak Avenue',
  customer_city: 'Amsterdam',
  customer_zip_code: '1012 AB',
  customer_country: 'Netherlands',

  // ── Dates ────────────────────────────────────────────────────────
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0],

  // ── Amounts ──────────────────────────────────────────────────────
  subtotal_amount: 2350.00,
  discount_type: 'percent',
  discount_amount: 10,
  discount_total_amount: 235.00,
  tax_type: 'percent',
  tax_amount: 21,
  tax_total_amount: 444.15,
  shipping_type: null,
  shipping_amount: null,
  shipping_total_amount: null,
  total_amount: 2559.15,

  // ── Notes / Terms ────────────────────────────────────────────────
  notes: 'Thank you for your business!',
  terms: 'Payment due within 30 days.',
  language: 'en',

  // ── Timestamps / search ──────────────────────────────────────────
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  search_tsv: null,
  search_text: null,

  // ── Line items ───────────────────────────────────────────────────
  items: [
    {
      id: 'item-1',
      invoice_id: 'dummy-preview',
      name: 'Web Design & Development',
      quantity: 1,
      unit_price: 1200.00,
      total_amount: 1200.00,
      sort_order: 0,
      created_at: null,
      updated_at: null,
    },
    {
      id: 'item-2',
      invoice_id: 'dummy-preview',
      name: 'SEO Optimization',
      quantity: 2,
      unit_price: 350.00,
      total_amount: 700.00,
      sort_order: 1,
      created_at: null,
      updated_at: null,
    },
    {
      id: 'item-3',
      invoice_id: 'dummy-preview',
      name: 'Hosting (Annual)',
      quantity: 1,
      unit_price: 450.00,
      total_amount: 450.00,
      sort_order: 2,
      created_at: null,
      updated_at: null,
    },
  ],

  // ── Placeholder company (overridden at runtime) ──────────────────
  company: {
    id: 'dummy-company',
    user_id: 'dummy-user',
    name: 'Acme Corp',
    email: 'info@acme.com',
    phone: '+31 20 123 4567',
    street: '123 Main Street',
    city: 'Amsterdam',
    zip_code: '1012 AB',
    country: 'Netherlands',
    vat_number: 'NL123456789B01',
    coc_number: '12345678',
    logo_url: null,
    template_id: null,
    currency_id: null,
    tax_percent: 21,
    terms: 'Payment due within 30 days.',
    language: 'en',
    created_at: null,
    updated_at: null,
  },

  // ── Placeholder currency (overridden at runtime) ─────────────────
  currency: {
    id: 'dummy-currency',
    user_id: null,
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbol_position: 'left',
    symbol_space: false,
    is_system: true,
    created_at: null,
    updated_at: null,
  },

  // ── No client by default ─────────────────────────────────────────
  client: null,
};
