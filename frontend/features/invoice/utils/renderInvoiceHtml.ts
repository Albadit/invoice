/**
 * Shared helper for building invoice HTML from a template + invoice data.
 *
 * Centralises the "try custom template → fall back to default" pattern
 * used by every route handler that produces HTML or PDF output.
 */

import {
  renderTemplate,
  customInvoiceHtml,
  InvoiceHtml,
} from '@/features/invoice/utils/templateEngine';
import type { InvoiceWithItems } from '@/lib/types';
import type { Translations } from '@/lib/i18n/translate';

export interface RenderOptions {
  /** Raw Mustache/Handlebars styling string (from editor or DB). */
  styling?: string | null;
  /** When true the HTML is wrapped for an in-browser preview (adds viewport meta etc.) */
  preview?: boolean;
}

/**
 * Render an invoice to an HTML string.
 *
 * @param invoice  – Full invoice (with items, currency, company, client)
 * @param labels   – i18n label map for the invoice language
 * @param options  – Optional: styling override & preview flag
 * @returns Complete HTML string ready for PDF generation or iframe display
 */
export function renderInvoiceHtml(
  invoice: InvoiceWithItems,
  labels: Translations,
  options: RenderOptions = {},
): string {
  const { styling, preview = false } = options;

  if (styling) {
    try {
      const body = renderTemplate(styling, invoice, labels);
      return customInvoiceHtml(body, { preview });
    } catch {
      // Malformed template – fall through to the built-in default
    }
  }

  return InvoiceHtml(invoice, labels);
}
