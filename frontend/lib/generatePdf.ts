'use server';

import puppeteer, { Browser, PDFOptions } from 'puppeteer';

/** Singleton browser instance — reused across PDF calls */
let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;

  // Avoid concurrent launch races
  if (browserLaunchPromise) return browserLaunchPromise;

  browserLaunchPromise = puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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

  browserInstance = await browserLaunchPromise;
  browserLaunchPromise = null;

  // Cleanup on disconnect
  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });

  return browserInstance;
}

export interface GeneratePdfOptions {
  html: string;
  css?: string;
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
 * Generate a PDF from HTML and CSS on the server.
 * Reuses a singleton Chromium browser for performance.
 */
export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { html, css = '', pdfOptions = {} } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: ${pdfOptions.format || 'A4'};
            margin: ${pdfOptions.margin?.top || '16mm'} ${pdfOptions.margin?.right || '16mm'} ${pdfOptions.margin?.bottom || '16mm'} ${pdfOptions.margin?.left || '16mm'};
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1.6;
            color: #000;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 500));

    const puppeteerPdfOptions: PDFOptions = {
      format: pdfOptions.format || 'A4',
      landscape: pdfOptions.landscape || false,
      printBackground: true,
      preferCSSPageSize: true,
      margin: pdfOptions.margin || {
        top: '16mm',
        right: '16mm',
        bottom: '16mm',
        left: '16mm',
      },
    };

    const pdfBuffer = await page.pdf(puppeteerPdfOptions);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}
