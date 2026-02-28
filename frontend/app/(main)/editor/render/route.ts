import { NextResponse } from 'next/server';
import { renderInvoiceHtml } from '@/features/invoice/utils/renderInvoiceHtml';
import { generatePdf } from '@/features/invoice/utils/generatePdf';
import { invoicesApi } from '@/features/invoice/api';
import { templatesApi } from '@/features/templates/api';
import { loadTranslations } from '@/lib/i18n/translate.server';
import { createClient } from '@/lib/supabase/server';
import type { InvoiceWithItems } from '@/lib/types';

// ── Shared helpers ─────────────────────────────────────────────────

async function getAuthToken() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function resolveInvoice(invoiceId: string | null, authToken?: string) {
  if (invoiceId) {
    return invoicesApi.getById(invoiceId, authToken);
  }
  const res = await invoicesApi.getAll({ limit: 1 });
  const first = res.data[0];
  return first ? invoicesApi.getById(first.id, authToken) : null;
}

async function getDbTemplateStyling(templateId: string | null, authToken?: string) {
  if (!templateId) return null;
  const templates = await templatesApi.getAll(authToken);
  const found = templates.find(t => t.id === templateId);
  return found?.styling ?? null;
}

// ── GET: Render with the DB template (used by iframe src) ──────────

/**
 * Returns rendered HTML using the invoice's assigned DB template.
 * Falls back to the built-in default when no template is assigned.
 *
 * Route: GET /invoice/test/render?id=<invoice id>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');
    const authToken = await getAuthToken();

    const invoice = await resolveInvoice(invoiceId, authToken);
    if (!invoice) {
      return new NextResponse('No invoice found', { status: 404 });
    }

    const labels = loadTranslations(invoice.language || 'en');
    const styling = await getDbTemplateStyling(invoice.template_id, authToken);

    const html = renderInvoiceHtml(invoice, labels, { styling, preview: true });

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Template preview error:', error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 },
    );
  }
}

// ── POST: Render with custom styling from the editor ───────────────

/**
 * Accepts a JSON body `{ id, styling }` and renders the template with
 * the provided styling instead of the DB version. Used by the live
 * template editor on the test page.
 *
 * Route: POST /invoice/test/render
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      id?: string;
      invoice?: InvoiceWithItems;
      styling?: string;
      pdf?: boolean;
    };

    const authToken = await getAuthToken();

    // Prefer inline invoice data (from template editor), fall back to DB lookup
    let invoice: InvoiceWithItems | null;
    if (body.invoice) {
      invoice = body.invoice as InvoiceWithItems;
    } else {
      invoice = await resolveInvoice(body.id ?? null, authToken);
    }

    if (!invoice) {
      return new NextResponse('No invoice found', { status: 404 });
    }

    const labels = loadTranslations(invoice.language || 'en');
    const { styling } = body;

    const html = renderInvoiceHtml(invoice, labels, {
      styling,
      preview: !body.pdf,
    });

    // Return PDF binary when requested
    if (body.pdf) {
      const pdfBuffer = await generatePdf({ html });
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="template-preview.pdf"`,
        },
      });
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Template preview error:', error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 },
    );
  }
}
