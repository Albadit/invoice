import { NextResponse } from 'next/server';
import { generatePdf } from '@/features/invoice/utils/generatePdf';
import {
  renderTemplate,
  customInvoiceHtml,
  InvoiceHtml,
} from '@/features/invoice/utils/templateEngine';
import { invoicesApi } from '@/features/invoice/api';
import { templatesApi } from '@/features/templates/api';
import { loadTranslations } from '@/lib/i18n/translate.server';
import { createClient } from '@/lib/supabase/server';


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

    // Get auth token from server-side session (required for RLS)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    // Fetch real invoice data from database
    const invoice = await invoicesApi.getById(invoiceId, authToken);
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Load translations for the invoice's language
    const lang = invoice.language || 'en';
    const labels = loadTranslations(lang);

    // Fetch template info
    let template = null;
    if (invoice.template_id) {
      const templates = await templatesApi.getAll(authToken);
      template = templates.find(t => t.id === invoice.template_id) || null;
    }

    // Build HTML for the invoice using the template renderer
    let html: string;
    
    if (template && template.styling) {
      try {
        // Render custom template using the mustache engine
        const body = renderTemplate(template.styling, invoice, labels);
        html = customInvoiceHtml(body);
      } catch (error) {
        // Fallback to default template if rendering fails
        console.error('Error rendering custom template, using default:', error);
        html = InvoiceHtml(invoice, labels);
      }
    } else {
      // Use default template — {{ lang.* }} tags handle translations automatically
      html = InvoiceHtml(invoice, labels);
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
 * POST /invoice/[id]/download
 *
 * Generates a PDF using custom styling from the request body instead of
 * the DB template. Used by the template editor test page.
 *
 * Body: { styling?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const { styling } = await request.json() as { styling?: string };

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    const invoice = await invoicesApi.getById(invoiceId, authToken);
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const labels = loadTranslations(invoice.language || 'en');

    let html: string;
    if (styling) {
      const body = renderTemplate(styling, invoice, labels);
      html = customInvoiceHtml(body);
    } else {
      // No styling provided — fall back to DB template / default
      let template = null;
      if (invoice.template_id) {
        const templates = await templatesApi.getAll(authToken);
        template = templates.find(t => t.id === invoice.template_id) || null;
      }
      if (template?.styling) {
        html = customInvoiceHtml(renderTemplate(template.styling, invoice, labels));
      } else {
        html = InvoiceHtml(invoice, labels);
      }
    }

    const pdfBuffer = await generatePdf({
      html,
      pdfOptions: {
        format: 'A4',
        landscape: false,
        margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
      },
    });

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