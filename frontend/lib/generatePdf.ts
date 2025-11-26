'use server';

/**
 * Server-side PDF Generation using Puppeteer
 * 
 * This module provides a reusable utility for generating PDFs from HTML/CSS
 * entirely on the server-side without any client-side rendering or API routes.
 * 
 * @module lib/generatePdf
 */

import puppeteer, { Browser, PDFOptions } from 'puppeteer';

/**
 * PDF generation configuration options
 */
export interface GeneratePdfOptions {
  /** Raw HTML string to render */
  html: string;
  /** Optional CSS to inject into the page */
  css?: string;
  /** PDF-specific options */
  pdfOptions?: {
    format?: 'A4' | 'Letter' | 'Legal';
    landscape?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };
}

/**
 * Generate a PDF from HTML and CSS on the server
 * 
 * This function launches a headless Chromium browser, injects the provided HTML
 * and CSS, and generates a PDF buffer. It's designed to be called from Next.js
 * server components or server actions.
 * 
 * @param options - Configuration for PDF generation
 * @returns Promise<Buffer> - PDF file as a Buffer
 * 
 * @example
 * ```ts
 * const pdf = await generatePdf({
 *   html: '<div class="invoice"><h1>Invoice #123</h1></div>',
 *   css: '.invoice { padding: 24px; }',
 *   pdfOptions: { format: 'A4' }
 * });
 * ```
 */
export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { html, css = '', pdfOptions = {} } = options;

  let browser: Browser | null = null;

  try {
    // Launch Puppeteer browser
    // For production/serverless, use puppeteer-core with @sparticuz/chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      timeout: 60000,
    });

    const page = await browser.newPage();

    // Build complete HTML document with CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Reset and base styles */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            /* Ensure colors print correctly */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Page configuration */
          @page {
            size: ${pdfOptions.format || 'A4'};
            margin: ${pdfOptions.margin?.top || '16mm'} ${pdfOptions.margin?.right || '16mm'} ${pdfOptions.margin?.bottom || '16mm'} ${pdfOptions.margin?.left || '16mm'};
          }

          /* Base typography */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1.6;
            color: #000;
          }

          /* Utility class for manual page breaks */
          .page-break {
            page-break-before: always;
            break-before: page;
          }

          /* Custom CSS from options */
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    // Set HTML content and wait for resources
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0', // Wait for all resources to load
    });

    // Additional wait to ensure Tailwind CSS processes all classes
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Configure PDF options
    const puppeteerPdfOptions: PDFOptions = {
      format: pdfOptions.format || 'A4',
      landscape: pdfOptions.landscape || false,
      printBackground: true, // Include background colors and images
      preferCSSPageSize: true, // Use @page CSS rules
      margin: pdfOptions.margin || {
        top: '16mm',
        right: '16mm',
        bottom: '16mm',
        left: '16mm',
      },
    };

    // Generate PDF
    const pdfBuffer = await page.pdf(puppeteerPdfOptions);

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Always close the browser to prevent memory leaks
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * SERVERLESS DEPLOYMENT ALTERNATIVE
 * ===================================
 * 
 * For AWS Lambda, Vercel, or other serverless platforms, use this configuration:
 * 
 * 1. Install dependencies:
 *    npm install puppeteer-core @sparticuz/chromium
 * 
 * 2. Replace the browser launch code with:
 * 
 * ```ts
 * import chromium from '@sparticuz/chromium';
 * import puppeteer from 'puppeteer-core';
 * 
 * const browser = await puppeteer.launch({
 *   args: chromium.args,
 *   defaultViewport: chromium.defaultViewport,
 *   executablePath: await chromium.executablePath(),
 *   headless: chromium.headless,
 * });
 * ```
 * 
 * 3. Update your package.json to exclude chromium from the bundle:
 * 
 * ```json
 * {
 *   "optionalDependencies": {
 *     "@sparticuz/chromium": "^119.0.0"
 *   }
 * }
 * ```
 */

/**
 * DEVELOPER NOTES
 * ===============
 * 
 * 1. EMBEDDING FONTS
 * ------------------
 * Use @font-face with data URLs or hosted fonts:
 * 
 * ```css
 * @font-face {
 *   font-family: 'CustomFont';
 *   src: url('data:font/woff2;base64,d09GMgAB...') format('woff2');
 *   font-weight: normal;
 *   font-style: normal;
 * }
 * 
 * body {
 *   font-family: 'CustomFont', sans-serif;
 * }
 * ```
 * 
 * Or use Google Fonts:
 * 
 * ```css
 * @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
 * 
 * body {
 *   font-family: 'Inter', sans-serif;
 * }
 * ```
 * 
 * 
 * 2. EMBEDDING IMAGES
 * -------------------
 * Use data URLs for small images:
 * 
 * ```html
 * <img src="data:image/png;base64,iVBORw0KGgoAAAANS..." alt="Logo" />
 * ```
 * 
 * Or use absolute URLs:
 * 
 * ```html
 * <img src="https://example.com/logo.png" alt="Logo" />
 * ```
 * 
 * 
 * 3. MANUAL PAGE BREAKS
 * ---------------------
 * Use CSS to control page breaks:
 * 
 * ```css
 * .page-break {
 *   page-break-before: always;
 *   break-before: page;
 * }
 * 
 * .avoid-break {
 *   page-break-inside: avoid;
 *   break-inside: avoid;
 * }
 * ```
 * 
 * ```html
 * <div>Page 1 content</div>
 * <div class="page-break"></div>
 * <div>Page 2 content</div>
 * ```
 * 
 * 
 * 4. CUSTOM PAGE SIZES
 * --------------------
 * Control page dimensions with @page:
 * 
 * ```css
 * @page {
 *   size: 210mm 297mm; // A4 portrait
 *   size: 297mm 210mm; // A4 landscape
 *   size: 8.5in 11in;  // US Letter
 *   margin: 20mm;
 * }
 * 
 * @page :first {
 *   margin-top: 10mm; // Different margin for first page
 * }
 * ```
 * 
 * 
 * 5. STORING PDFs
 * ---------------
 * 
 * A. Upload to Supabase Storage:
 * 
 * ```ts
 * import { createClient } from '@/lib/supabase';
 * 
 * const supabase = createClient();
 * const pdfBuffer = await generatePdf({ html, css });
 * 
 * const { data, error } = await supabase.storage
 *   .from('invoices')
 *   .upload(`invoice-${invoiceId}.pdf`, pdfBuffer, {
 *     contentType: 'application/pdf',
 *     upsert: true,
 *   });
 * 
 * if (error) throw error;
 * 
 * // Get public URL
 * const { data: urlData } = supabase.storage
 *   .from('invoices')
 *   .getPublicUrl(`invoice-${invoiceId}.pdf`);
 * ```
 * 
 * B. Upload to AWS S3:
 * 
 * ```ts
 * import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
 * 
 * const s3 = new S3Client({ region: 'us-east-1' });
 * const pdfBuffer = await generatePdf({ html, css });
 * 
 * await s3.send(new PutObjectCommand({
 *   Bucket: 'my-bucket',
 *   Key: `invoices/invoice-${invoiceId}.pdf`,
 *   Body: pdfBuffer,
 *   ContentType: 'application/pdf',
 * }));
 * ```
 * 
 * C. Save to filesystem (development only):
 * 
 * ```ts
 * import fs from 'fs/promises';
 * import path from 'path';
 * 
 * const pdfBuffer = await generatePdf({ html, css });
 * const filePath = path.join(process.cwd(), 'public', 'invoices', `invoice-${invoiceId}.pdf`);
 * 
 * await fs.mkdir(path.dirname(filePath), { recursive: true });
 * await fs.writeFile(filePath, pdfBuffer);
 * ```
 * 
 * 
 * 6. PERFORMANCE TIPS
 * -------------------
 * - Cache browser instances in development (not shown here for simplicity)
 * - Use puppeteer-core + @sparticuz/chromium in production
 * - Keep HTML/CSS simple for faster rendering
 * - Avoid heavy JavaScript or animations
 * - Use system fonts when possible
 * - Optimize images before embedding
 * 
 * 
 * 7. DEBUGGING
 * ------------
 * Enable screenshots for debugging:
 * 
 * ```ts
 * await page.screenshot({ path: 'debug.png', fullPage: true });
 * ```
 * 
 * Or launch browser with headless: false:
 * 
 * ```ts
 * const browser = await puppeteer.launch({
 *   headless: false, // See the browser
 *   devtools: true,  // Open DevTools
 * });
 * ```
 */
