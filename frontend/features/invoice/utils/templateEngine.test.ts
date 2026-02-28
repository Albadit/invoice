/**
 * Template Engine Unit Tests
 *
 * Tests the mustache-like interpolation engine used for default invoice PDFs.
 * Run with:  npx vitest run features/invoice/utils/templateEngine.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePath,
  renderTemplate,
  translateCustomHtml,
  customInvoiceHtml,
  InvoiceHtml,
} from './templateEngine';
import type { InvoiceWithItems } from '@/lib/types';
import type { Translations } from '@/lib/i18n/translate';

// ── Test fixtures ──────────────────────────────────────────────────

const mockCurrency = {
  id: 'cur-1',
  user_id: null,
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  symbol_position: 'left' as const,
  symbol_space: false,
  is_system: true,
  created_at: null,
  updated_at: null,
};

const mockCompany = {
  id: 'comp-1',
  user_id: 'user-1',
  name: 'Acme Corp',
  email: 'info@acme.com',
  phone: '+1-555-0100',
  street: '123 Main St',
  city: 'Springfield',
  zip_code: '62701',
  country: 'US',
  vat_number: 'US123456',
  coc_number: 'COC-789',
  logo_url: 'https://example.com/logo.png',
  template_id: null,
  currency_id: 'cur-1',
  tax_percent: 21,
  terms: null,
  language: 'en',
  created_at: null,
  updated_at: null,
};

const mockInvoice: InvoiceWithItems = {
  id: 'inv-1',
  user_id: 'user-1',
  company_id: 'comp-1',
  currency_id: 'cur-1',
  template_id: null,
  client_id: null,
  invoice_code: 'INV-001',
  status: 'pending',
  customer_name: 'John Doe',
  customer_street: '456 Oak Ave',
  customer_city: 'Shelbyville',
  customer_zip_code: '62702',
  customer_country: 'US',
  issue_date: '2025-01-15',
  due_date: '2025-02-15',
  discount_type: 'fixed',
  discount_amount: 10,
  discount_total_amount: 10,
  tax_type: 'percent',
  tax_amount: 21,
  tax_total_amount: 42,
  shipping_type: null,
  shipping_amount: null,
  shipping_total_amount: null,
  notes: 'Thank you for your business',
  terms: 'Net 30',
  language: 'en',
  subtotal_amount: 200,
  total_amount: 232,
  created_at: null,
  updated_at: null,
  search_tsv: null,
  search_text: null,
  items: [
    {
      id: 'item-1',
      invoice_id: 'inv-1',
      name: 'Widget A',
      quantity: 2,
      unit_price: 50,
      total_amount: 100,
      sort_order: 0,
      created_at: null,
      updated_at: null,
    },
    {
      id: 'item-2',
      invoice_id: 'inv-1',
      name: 'Widget B',
      quantity: 1,
      unit_price: 100,
      total_amount: 100,
      sort_order: 1,
      created_at: null,
      updated_at: null,
    },
  ],
  currency: mockCurrency,
  company: mockCompany,
};

const mockLabels: Translations = {
  preview: {
    invoiceTitle: 'INVOICE',
    issueDate: 'Issue Date:',
    dueDate: 'Due Date:',
    billTo: 'Bill To:',
    vatNumber: 'VAT',
    cocNumber: 'CoC',
  },
  fields: {
    item: 'Item',
    quantity: 'Quantity',
    rate: 'Rate',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    shipping: 'Shipping',
    total: 'Total',
    notes: 'Notes',
    terms: 'Terms & Conditions',
  },
};

// ── resolvePath ────────────────────────────────────────────────────

describe('resolvePath', () => {
  it('resolves a single-level key', () => {
    expect(resolvePath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves a nested dotted path', () => {
    expect(resolvePath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(resolvePath({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns undefined for deep missing path', () => {
    expect(resolvePath({ a: { b: 1 } }, 'a.c.d')).toBeUndefined();
  });
});

// ── renderTemplate — simple interpolation ──────────────────────────

describe('renderTemplate — simple tags', () => {
  it('resolves {{ company.name }}', () => {
    const out = renderTemplate('Hello {{ company.name }}!', mockInvoice, mockLabels);
    expect(out).toBe('Hello Acme Corp!');
  });

  it('resolves {{ customer.name }}', () => {
    const out = renderTemplate('To: {{ customer.name }}', mockInvoice, mockLabels);
    expect(out).toBe('To: John Doe');
  });

  it('resolves {{ invoice.invoice_code }}', () => {
    const out = renderTemplate('#{{ invoice.invoice_code }}', mockInvoice, mockLabels);
    expect(out).toBe('#INV-001');
  });

  it('returns empty string for missing field', () => {
    const inv = { ...mockInvoice, company: { ...mockCompany, phone: null } };
    const out = renderTemplate('Phone: {{ company.phone }}', inv, mockLabels);
    expect(out).toBe('Phone: ');
  });
});

// ── renderTemplate — lang tags ─────────────────────────────────────

describe('renderTemplate — {{ lang.* }}', () => {
  it('resolves a translation key', () => {
    const out = renderTemplate('<h2>{{ lang.preview.invoiceTitle }}</h2>', mockInvoice, mockLabels);
    expect(out).toBe('<h2>INVOICE</h2>');
  });

  it('returns empty for missing key', () => {
    const out = renderTemplate('X{{ lang.missing.key }}X', mockInvoice, mockLabels);
    // tl returns key itself when not found → 'missing.key'
    expect(out).toBe('Xmissing.keyX');
  });
});

// ── renderTemplate — date tags ─────────────────────────────────────

describe('renderTemplate — {{ date.* }}', () => {
  it('formats issue_date', () => {
    const out = renderTemplate('Issued: {{ date.issue_date }}', mockInvoice, mockLabels);
    // siteConfig.invoiceDateFormat = 'dd-MM-yyyy'
    expect(out).toBe('Issued: 15-01-2025');
  });

  it('formats due_date', () => {
    const out = renderTemplate('Due: {{ date.due_date }}', mockInvoice, mockLabels);
    expect(out).toBe('Due: 15-02-2025');
  });

  it('returns empty for null date', () => {
    const inv = { ...mockInvoice, issue_date: null };
    const out = renderTemplate('{{ date.issue_date }}', inv, mockLabels);
    expect(out).toBe('');
  });
});

// ── renderTemplate — fc (currency) tags ────────────────────────────

describe('renderTemplate — {{ fc.* }}', () => {
  it('formats subtotal_amount', () => {
    const out = renderTemplate('{{ fc.subtotal_amount }}', mockInvoice, mockLabels);
    expect(out).toBe('$200.00');
  });

  it('formats total_amount', () => {
    const out = renderTemplate('{{ fc.total_amount }}', mockInvoice, mockLabels);
    expect(out).toBe('$232.00');
  });

  it('returns empty for null amount field', () => {
    const inv = { ...mockInvoice, shipping_total_amount: null };
    const out = renderTemplate('{{ fc.shipping_total_amount }}', inv, mockLabels);
    expect(out).toBe('');
  });
});

// ── renderTemplate — {{#if}} conditionals ──────────────────────────

describe('renderTemplate — {{#if}}', () => {
  it('renders if-block when truthy', () => {
    const tpl = '{{#if company.logo_url}}<img src="{{ company.logo_url }}"/>{{/if}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toContain('<img src="https://example.com/logo.png"/>');
  });

  it('hides if-block when falsy', () => {
    const inv = { ...mockInvoice, company: { ...mockCompany, logo_url: null } };
    const tpl = '{{#if company.logo_url}}VISIBLE{{/if}}';
    const out = renderTemplate(tpl, inv, mockLabels);
    expect(out).toBe('');
  });

  it('renders else-block when falsy', () => {
    const inv = { ...mockInvoice, company: { ...mockCompany, logo_url: null } };
    const tpl = '{{#if company.logo_url}}HAS_LOGO{{else}}NO_LOGO{{/if}}';
    const out = renderTemplate(tpl, inv, mockLabels);
    expect(out).toBe('NO_LOGO');
  });

  it('renders if-block and skips else when truthy', () => {
    const tpl = '{{#if invoice.discount_amount}}DISCOUNT{{else}}NONE{{/if}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('DISCOUNT');
  });

  it('handles nested {{#if}} blocks', () => {
    const tpl = '{{#if company.city}}<p>{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('<p>Springfield, 62701</p>');
  });

  it('handles nested {{#if}} when inner is falsy', () => {
    const inv = { ...mockInvoice, company: { ...mockInvoice.company, zip_code: null } };
    const tpl = '{{#if company.city}}<p>{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}';
    const out = renderTemplate(tpl, inv, mockLabels);
    expect(out).toBe('<p>Springfield</p>');
  });

  it('handles nested {{#if}} when outer is falsy', () => {
    const inv = { ...mockInvoice, company: { ...mockInvoice.company, city: null } };
    const tpl = '{{#if company.city}}<p>{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}';
    const out = renderTemplate(tpl, inv, mockLabels);
    expect(out).toBe('');
  });
});

// ── renderTemplate — {{#each items}} ───────────────────────────────

describe('renderTemplate — {{#each items}}', () => {
  it('iterates over all items', () => {
    const tpl = '{{#each items}}<li>{{ item.name }}</li>{{/each}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('<li>Widget A</li><li>Widget B</li>');
  });

  it('resolves item.quantity and item.unit_price', () => {
    const tpl = '{{#each items}}{{ item.quantity }}x{{ item.unit_price }} {{/each}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('2x50 1x100 ');
  });

  it('resolves fc.item_unit_price (currency formatted)', () => {
    const tpl = '{{#each items}}{{ fc.item_unit_price }},{{/each}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('$50.00,$100.00,');
  });

  it('resolves fc.item_amount (quantity × unit_price formatted)', () => {
    const tpl = '{{#each items}}{{ fc.item_amount }},{{/each}}';
    const out = renderTemplate(tpl, mockInvoice, mockLabels);
    expect(out).toBe('$100.00,$100.00,');
  });

  it('produces empty string when no items', () => {
    const inv = { ...mockInvoice, items: [] };
    const tpl = '{{#each items}}<li>{{ item.name }}</li>{{/each}}';
    const out = renderTemplate(tpl, inv, mockLabels);
    expect(out).toBe('');
  });
});

// ── translateCustomHtml ────────────────────────────────────────────

describe('translateCustomHtml', () => {
  const nlLabels: Translations = {
    preview: {
      invoiceTitle: 'FACTUUR',
      issueDate: 'Factuurdatum:',
      dueDate: 'Vervaldatum:',
      billTo: 'Factuuradres:',
      vatNumber: 'BTW',
      cocNumber: 'KvK',
    },
    fields: {
      item: 'Artikel',
      quantity: 'Aantal',
      rate: 'Tarief',
      amount: 'Bedrag',
      subtotal: 'Subtotaal',
      discount: 'Korting',
      tax: 'Belasting',
      shipping: 'Verzending',
      total: 'Totaal',
      notes: 'Opmerkingen',
      terms: 'Voorwaarden',
    },
  };

  it('replaces "INVOICE" with translated version', () => {
    const html = '<h2>INVOICE</h2>';
    const out = translateCustomHtml(html, nlLabels);
    expect(out).toContain('FACTUUR');
    expect(out).not.toContain('INVOICE');
  });

  it('replaces "Subtotal" with translated version', () => {
    const html = '<span>Subtotal</span>';
    const out = translateCustomHtml(html, nlLabels);
    expect(out).toContain('Subtotaal');
  });

  it('replaces VAT: keeping colon', () => {
    const html = '<span>VAT:</span>';
    const out = translateCustomHtml(html, nlLabels);
    expect(out).toContain('BTW:');
  });

  it('does not replace when translation matches English', () => {
    // If translations were the same as English, no replacement
    const enLabels: Translations = {
      preview: { invoiceTitle: 'INVOICE' },
      fields: {},
    };
    const html = '<h2>INVOICE</h2>';
    const out = translateCustomHtml(html, enLabels);
    expect(out).toBe(html);
  });
});

// ── customInvoiceHtml ──────────────────────────────────────────────

describe('customInvoiceHtml', () => {
  it('wraps body content in full HTML document', () => {
    const body = '<div>My invoice</div>';
    const out = customInvoiceHtml(body);
    expect(out).toContain('<!DOCTYPE html>');
    expect(out).toContain('<body>');
    expect(out).toContain(body);
    expect(out).toContain('</html>');
  });

  it('includes Inter font link', () => {
    const out = customInvoiceHtml('');
    expect(out).toContain('fonts.googleapis.com');
    expect(out).toContain('Inter');
  });
});

// ── InvoiceHtml (full default template) ────────────────────────────

describe('InvoiceHtml', () => {
  it('contains the invoice code', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('INV-001');
  });

  it('contains company name', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('Acme Corp');
  });

  it('contains customer name', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('John Doe');
  });

  it('contains formatted dates', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('15-01-2025');
    expect(html).toContain('15-02-2025');
  });

  it('contains currency-formatted total', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('$232.00');
  });

  it('contains item names', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('Widget A');
    expect(html).toContain('Widget B');
  });

  it('contains translated labels', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('INVOICE');
    expect(html).toContain('Bill To:');
    expect(html).toContain('Issue Date:');
    expect(html).toContain('Due Date:');
  });

  it('shows discount when present', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('Discount');
    expect(html).toContain('$10.00');
  });

  it('hides shipping when null', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    // shipping_amount is null → shipping block hidden
    expect(html).not.toContain('Shipping');
  });

  it('shows VAT and CoC numbers', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('US123456');
    expect(html).toContain('COC-789');
  });

  it('shows logo image when logo_url exists', () => {
    const html = InvoiceHtml(mockInvoice, mockLabels);
    expect(html).toContain('https://example.com/logo.png');
    expect(html).not.toContain('Logo Demo');
  });

  it('shows placeholder when logo_url is null', () => {
    const inv = { ...mockInvoice, company: { ...mockCompany, logo_url: null } };
    const html = InvoiceHtml(inv, mockLabels);
    expect(html).toContain('Logo Demo');
  });
});
