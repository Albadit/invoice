import { NextResponse } from 'next/server';
import { generatePdf } from '@/lib/generatePdf';
import { invoicesApi } from '@/features/invoice/api';
import { templatesApi } from '@/features/settings/api';
import { renderInvoiceToHtml } from '@/lib/renderTemplate';
import { formatWithCurrency } from '@/lib/utils';
import { tl } from '@/lib/i18n/translate';
import { loadTranslations } from '@/lib/i18n/translate.server';
import type { Translations } from '@/lib/i18n/translate';
import type { InvoiceWithItems, InvoiceItem } from '@/lib/types';

/**
 * Replace English labels in rendered HTML with translated versions.
 * Uses HTML-context-aware regex so only text between > and < is replaced,
 * preventing accidental replacement inside attributes or CSS.
 */
function translateHtml(html: string, labels: Translations): string {
  // Hardcoded English template strings paired with their translation key paths.
  // Order matters: longer/more-specific strings first to avoid partial matches.
  const replacements: [string, string][] = [
    ['Terms & Conditions', 'fields.terms'],
    ['Issue Date:', 'preview.issueDate'],
    ['Due Date:', 'preview.dueDate'],
    ['Bill To:', 'preview.billTo'],
    ['INVOICE', 'preview.invoiceTitle'],
    ['Subtotal', 'fields.subtotal'],
    ['Quantity', 'fields.quantity'],
    ['Shipping', 'fields.shipping'],
    ['Discount', 'fields.discount'],
    ['Amount', 'fields.amount'],
    ['Notes', 'fields.notes'],
    ['Total', 'fields.total'],
    ['Item', 'fields.item'],
    ['Rate', 'fields.rate'],
    ['Tax', 'fields.tax'],
  ];

  let result = html;
  for (const [en, key] of replacements) {
    const translated = tl(labels, key);
    if (translated && translated !== key && translated !== en) {
      // Escape special regex chars in the English text
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only replace when text appears as HTML content (between > and <)
      const regex = new RegExp(`(>[^<]*)${escaped}([^<]*<)`, 'g');
      result = result.replace(regex, `$1${translated}$2`);
    }
  }
  return result;
}

/**
 * Wrap rendered invoice HTML in a complete HTML document with styles
 */
function customInvoiceHtml(bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * {
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Inter, sans-serif;
        }
      </style>
    </head>
    <body class="bg-white">
      ${bodyContent}
    </body>
    </html>
  `;
}


/**
 * Server-Side PDF Download Route
 * 
 * This page component generates and downloads a PDF entirely on the server.
 * No client-side rendering or API routes are involved.
 * 
 * Route: /invoice/[id]/download
 * 
 * When a user navigates to this URL, the PDF is generated on-the-fly
 * and streamed directly to the browser as a download.
 * 
 * @param params - Route parameters containing the invoice ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    // Fetch real invoice data from database
    const invoice = await invoicesApi.getById(invoiceId);
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Load translations for the invoice's language
    const lang = invoice.language || 'en';
    const labels = loadTranslations(lang);

    // Fetch template info
    let template = null;
    if (invoice.template_id) {
      const templates = await templatesApi.getAll();
      template = templates.find(t => t.id === invoice.template_id) || null;
    }

    // Build HTML for the invoice using the template renderer
    let html: string;
    
    if (template && template.styling) {
      try {
        // Render custom template from database
        html = renderInvoiceToHtml(template.styling, {
          invoice,
          company: invoice.company,
          currency: invoice.currency,
        });

        // Wrap in complete HTML document for PDF
        html = customInvoiceHtml(html);
      } catch (error) {
        // Fallback to default template if rendering fails
        console.error('Error rendering custom template, using default:', error);
        html = InvoiceHtml(invoice, labels);
      }
    } else {
      // Use default template
      html = InvoiceHtml(invoice, labels);
    }

    // Replace English labels with translated versions (works for custom templates too)
    if (lang !== 'en') {
      html = translateHtml(html, labels);
    }
    
    // Generate PDF on the server (no CSS needed - Tailwind is included in HTML)
    const pdfBuffer = await generatePdf({
      html,
      pdfOptions: {
        format: 'A4',
        landscape: false,
        margin: {
          top: '16mm',
          right: '16mm',
          bottom: '16mm',
          left: '16mm',
        },
      },
    });

    // Return PDF as a downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_code}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return new NextResponse(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

/**
 * Build HTML content for the invoice
 * 
 * This function generates the HTML structure for the invoice PDF using real data.
 * 
 * 
 * @param invoice - The invoice data with items
 * @param company - The company data with name, address, and logo
 * @param currency - The currency data with symbol and code
 * @returns HTML string
 */
function InvoiceHtml(invoice: InvoiceWithItems, labels: Translations): string {
  // Get currency symbol
  const fc = (amount: string | number) => formatWithCurrency(invoice.currency, amount);

  // Default template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body {
          font-family: Inter, sans-serif;
        }
      </style>
    </head>
    <body class="bg-white">
      <div class="w-full h-full bg-white flex flex-col gap-8">
        <!-- Header -->
        <div class="flex flex-col gap-4">
          <div class="flex justify-between">
            ${invoice.company?.logo_url ? `
              <img src="${invoice.company.logo_url}" alt="Logo" class="h-16" />
            ` : `
              <div class="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-bold">
                Logo Demo
              </div>
            `}
            <div class="flex flex-col gap-2 text-right">
              <h2 class="text-4xl font-bold text-slate-900">${tl(labels, 'preview.invoiceTitle')}</h2>
              <p class="text-2xl text-slate-600 font-semibold">#${invoice.invoice_code}</p>
            </div>
          </div>

          <div class="flex justify-between">
            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-gray-900">${invoice.company?.name || ''}</h1>
              ${invoice.company?.street ? `<p class="text-sm text-gray-600">${invoice.company.street}</p>` : ''}
              ${invoice.company?.city && invoice.company?.zip_code ? `<p class="text-sm text-gray-600">${invoice.company.city}, ${invoice.company.zip_code}</p>` : invoice.company?.city ? `<p class="text-sm text-gray-600">${invoice.company.city}</p>` : ''}
              ${invoice.company?.country ? `<p class="text-sm text-gray-600">${invoice.company.country}</p>` : ''}
              ${invoice.company?.email ? `<p class="text-sm text-gray-600">${invoice.company.email}</p>` : ''}
              ${invoice.company?.phone ? `<p class="text-sm text-gray-600">${invoice.company.phone}</p>` : ''}
            </div>
            <div class="flex flex-col gap-1">
              ${invoice.issue_date ? `
                <div class="flex justify-end gap-3">
                  <span class="text-sm font-semibold text-gray-600">${tl(labels, 'preview.issueDate')}</span>
                  <span class="text-sm text-gray-900">${invoice.issue_date}</span>
                </div>
              ` : ''}
              ${invoice.due_date ? `
                <div class="flex justify-end gap-3">
                  <span class="text-sm font-semibold text-gray-600">${tl(labels, 'preview.dueDate')}</span>
                  <span class="text-sm text-gray-900">${invoice.due_date}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <hr class="border-1 border-gray-200"/>

        <!-- Bill To -->
        <div class="flex flex-col">
          <h3 class="text-xs font-bold uppercase text-gray-600">${tl(labels, 'preview.billTo')}</h3>
          <p class="text-lg font-semibold text-gray-900">${invoice.customer_name}</p>
          ${invoice.customer_street ? `<p class="text-sm text-gray-600">${invoice.customer_street}</p>` : ''}
          ${invoice.customer_city ? `<p class="text-sm text-gray-600">${invoice.customer_city}</p>` : ''}
          ${invoice.customer_country ? `<p class="text-sm text-gray-600">${invoice.customer_country}</p>` : ''}
        </div>

        <!-- Items Table -->
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-12 border-b-2 py-3 border-slate-900">
            <div class="col-span-5 text-sm font-bold text-slate-900 uppercase">${tl(labels, 'fields.item')}</div>
            <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">${tl(labels, 'fields.quantity')}</div>
            <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">${tl(labels, 'fields.rate')}</div>
            <div class="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">${tl(labels, 'fields.amount')}</div>
          </div>
          ${invoice.items.map((item: InvoiceItem) => `
            <div class="grid grid-cols-12">
              <span class="col-span-5 text-slate-700">${item.name}</span>
              <span class="col-span-2 text-slate-700 text-center">${item.quantity}</span>
              <span class="col-span-2 text-slate-700 text-right">${fc(item.unit_price.toFixed(2))}</span>
              <span class="col-span-3 text-slate-900 font-semibold text-right">${fc((item.quantity * item.unit_price).toFixed(2))}</span>
            </div>
          `).join('')}
        </div>

        <div class="grid grid-cols-2 gap-8 grow content-end">
          <!-- Terms & Notes -->
          <div class="flex flex-col gap-8">
            <div>
              <h4 class="text-sm font-bold text-gray-900">${tl(labels, 'fields.notes')}</h4>
              <p class="text-sm text-gray-600 whitespace-pre-line">${invoice.notes}</p>
            </div>
            <div>
              <h4 class="text-sm font-bold text-gray-900">${tl(labels, 'fields.terms')}</h4>
              <p class="text-sm text-gray-600 whitespace-pre-line">${invoice.terms}</p>
            </div>
          </div>

          <!-- Totals -->
          <div class="flex flex-col gap-4">
            <div class="flex justify-between text-slate-700">
              <span class="font-semibold text-gray-700">${tl(labels, 'fields.subtotal')}:</span>
              <span class="font-semibold text-gray-900">${fc((invoice.subtotal_amount ?? 0).toFixed(2))}</span>
            </div>
            ${invoice.discount_amount && invoice.discount_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">${tl(labels, 'fields.discount')} (${invoice.discount_type === 'percent' ? invoice.discount_amount + '%' : fc(invoice.discount_amount)}):</span>
                <span class="font-semibold text-gray-900">-${fc((invoice.discount_amount ?? 0).toFixed(2))}</span>
              </div>
            ` : ''}
            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">${tl(labels, 'fields.tax')} (${invoice.tax_type === 'percent' ? invoice.tax_amount + '%' : fc(invoice.tax_amount)}):</span>
                <span class="font-semibold text-gray-900">${fc((invoice.tax_amount ?? 0).toFixed(2))}</span>
              </div>
            ` : ''}
            ${invoice.shipping_amount && invoice.shipping_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">${tl(labels, 'fields.shipping')}:</span>
                <span class="font-semibold text-gray-900">${fc((invoice.shipping_amount ?? 0).toFixed(2))}</span>
              </div>
            ` : ''}
            <div class="flex justify-between items-center pt-2 border-t">
              <span class="text-xl font-bold text-gray-900">${tl(labels, 'fields.total')}:</span>
              <span class="text-2xl font-bold text-gray-900">${fc((invoice.total_amount ?? 0).toFixed(2))}</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}