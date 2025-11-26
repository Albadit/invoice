import { NextResponse } from 'next/server';
import { generatePdf } from '@/lib/generatePdf';
import { invoicesApi, templatesApi } from '@/lib/api';
import { renderInvoiceToHtml } from '@/lib/renderTemplate';

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
        html = InvoiceHtml(invoice);
      }
    } else {
      // Use default template
      html = InvoiceHtml(invoice);
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
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
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
function InvoiceHtml(invoice: any): string {
  // Get currency symbol

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
              <img src="${invoice.company.logo_url}" alt="Logo" class="h-16 mb-4" />
            ` : `
              <div class="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-bold mb-4">
                Logo Demo
              </div>
            `}
            <div class="flex flex-col gap-2 text-right">
              <h2 class="text-4xl font-bold text-slate-900">INVOICE</h2>
              <p class="text-2xl text-slate-600 font-semibold">#${invoice.invoice_number}</p>
            </div>
          </div>

          <div class="flex justify-between">
            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-gray-900 mb-2">${invoice.company?.name || ''}</h1>
              ${invoice.company?.street ? `<p class="text-sm text-gray-600">${invoice.company.street}</p>` : ''}
              ${invoice.company?.city && invoice.company?.zip_code ? `<p class="text-sm text-gray-600">${invoice.company.city}, ${invoice.company.zip_code}</p>` : invoice.company?.city ? `<p class="text-sm text-gray-600">${invoice.company.city}</p>` : ''}
              ${invoice.company?.country ? `<p class="text-sm text-gray-600">${invoice.company.country}</p>` : ''}
              ${invoice.company?.email ? `<p class="text-sm text-gray-600">${invoice.company.email}</p>` : ''}
              ${invoice.company?.phone ? `<p class="text-sm text-gray-600">${invoice.company.phone}</p>` : ''}
            </div>
            <div class="flex flex-col gap-1">
              ${invoice.issue_date ? `
                <div class="flex justify-end gap-3">
                  <span class="text-sm font-semibold text-gray-600">Issue Date:</span>
                  <span class="text-sm text-gray-900">${invoice.issue_date}</span>
                </div>
              ` : ''}
              ${invoice.due_date ? `
                <div class="flex justify-end gap-3">
                  <span class="text-sm font-semibold text-gray-600">Due Date:</span>
                  <span class="text-sm text-gray-900">${invoice.due_date}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <hr class="border-1 border-gray-200"/>

        <!-- Bill To -->
        <div class="flex flex-col">
          <h3 class="text-xs font-bold uppercase text-gray-600 mb-2">Bill To:</h3>
          <p class="text-lg font-semibold text-gray-900">${invoice.customer_name}</p>
          ${invoice.customer_street ? `<p class="text-sm text-gray-600">${invoice.customer_street}</p>` : ''}
          ${invoice.customer_city ? `<p class="text-sm text-gray-600">${invoice.customer_city}</p>` : ''}
          ${invoice.customer_country ? `<p class="text-sm text-gray-600">${invoice.customer_country}</p>` : ''}
        </div>

        <!-- Items Table -->
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-12 border-b-2 py-3 border-slate-900">
            <div class="col-span-5 text-sm font-bold text-slate-900 uppercase">Item</div>
            <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">Quantity</div>
            <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">Rate</div>
            <div class="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">Amount</div>
          </div>
          ${invoice.items.map((item: any) => `
            <div class="grid grid-cols-12">
              <span class="col-span-5 text-slate-700">${item.name}</span>
              <span class="col-span-2 text-slate-700 text-center">${item.quantity}</span>
              <span class="col-span-2 text-slate-700 text-right">${invoice.currency.symbol}${item.unit_price.toFixed(2)}</span>
              <span class="col-span-3 text-slate-900 font-semibold text-right">${invoice.currency.symbol}${(item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="grid grid-cols-2 gap-8 grow content-end">
          <!-- Terms & Notes -->
          <div class="flex flex-col gap-8">
            <div>
              <h4 class="text-sm font-bold text-gray-900 mb-2">Notes</h4>
              <p class="text-sm text-gray-600 whitespace-pre-line">${invoice.notes}</p>
            </div>
            <div>
              <h4 class="text-sm font-bold text-gray-900 mb-2">Terms & Conditions</h4>
              <p class="text-sm text-gray-600 whitespace-pre-line">${invoice.terms}</p>
            </div>
          </div>

          <!-- Totals -->
          <div class="flex flex-col gap-4">
            <div class="flex justify-between text-slate-700">
              <span class="font-semibold text-gray-700">Subtotal:</span>
              <span class="font-semibold text-gray-900">${invoice.currency.symbol}${invoice.subtotal_amount.toFixed(2)}</span>
            </div>
            ${invoice.discount_amount && invoice.discount_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">Discount (${invoice.discount_type === 'percent' ? invoice.discount_amount + '%' : invoice.currency.symbol + invoice.discount_amount}):</span>
                <span class="font-semibold text-gray-900">-${invoice.currency.symbol}${invoice.discount_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">Tax (${invoice.tax_type === 'percent' ? invoice.tax_amount + '%' : invoice.currency.symbol + invoice.tax_amount}):</span>
                <span class="font-semibold text-gray-900">${invoice.currency.symbol}${invoice.tax_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoice.shipping_amount && invoice.shipping_amount > 0 ? `
              <div class="flex justify-between text-slate-700">
                <span class="text-gray-700">Shipping:</span>
                <span class="font-semibold text-gray-900">${invoice.currency.symbol}${invoice.shipping_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between items-center pt-2 border-t">
              <span class="text-xl font-bold text-gray-900">Total:</span>
              <span class="text-2xl font-bold text-gray-900">${invoice.currency.symbol}${invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}