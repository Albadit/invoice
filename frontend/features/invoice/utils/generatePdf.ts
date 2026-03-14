'use server';

import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';

/** Singleton browser instance — reused across PDF calls */
let browserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;

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
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--disable-default-apps',
      '--mute-audio',
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

  // Forward browser console to Node console for debugging
  page.on('console', msg => console.log('[Puppeteer]', msg.text()));

  try {
    const m = pdfOptions.margin || { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' };

    // Set viewport to match A4 at 96 DPI so Tailwind computes pixel values
    // that map 1:1 to the PDF page dimensions (no scaling artefacts).
    await page.setViewport({ width: 794, height: 1123 });

    // For header/footer to repeat on every PDF page, Chromium requires
    // position: fixed. We modify the HTML class strings BEFORE Tailwind
    // processes them so Tailwind itself generates `position: fixed`.
    let processedHtml = html;

    // Header: replace "absolute" with "fixed", or add "fixed top-0 left-0"
    // if no positioning class exists
    if (/<header\s[^>]*class="[^"]*\babsolute\b/.test(processedHtml)) {
      processedHtml = processedHtml.replace(
        /(<header\s[^>]*class="[^"]*)\babsolute\b/,
        '$1fixed'
      );
    } else if (/<header\s/.test(processedHtml)) {
      processedHtml = processedHtml.replace(
        /(<header\s[^>]*class=")/,
        '$1fixed top-0 left-0 '
      );
    }

    // Footer: replace "absolute" with "fixed", or add "fixed bottom-0 left-0"
    if (/<footer\s[^>]*class="[^"]*\babsolute\b/.test(processedHtml)) {
      processedHtml = processedHtml.replace(
        /(<footer\s[^>]*class="[^"]*)\babsolute\b/,
        '$1fixed'
      );
    } else if (/<footer\s/.test(processedHtml)) {
      processedHtml = processedHtml.replace(
        /(<footer\s[^>]*class=")/,
        '$1fixed bottom-0 left-0 '
      );
    }

    // Inject print CSS: horizontal padding on main/header/footer.
    // Do NOT set @page margin here — we let Puppeteer's margin option
    // handle page margins so content is pushed down on EVERY page.
    const printCss = `
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { padding-top: 0 !important; padding-bottom: 0 !important; padding-left: ${m.left} !important; padding-right: ${m.right} !important; }
      header { padding-left: ${m.left} !important; padding-right: ${m.right} !important; }
      footer { padding-left: ${m.left} !important; padding-right: ${m.right} !important; }
      .page-break { page-break-before: always; break-before: page; }
      ${css}
    `;
    processedHtml = processedHtml.replace('</head>', `<style>${printCss}</style></head>`);

    // networkidle0 is required — Tailwind CDN must be fetched and executed
    await page.setContent(processedHtml, { waitUntil: 'networkidle0' });

    // Measure header/footer heights so we can reserve space on every page.
    const dims = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('header');
      const footer = document.querySelector<HTMLElement>('footer');
      return {
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        footerHeight: footer ? footer.getBoundingClientRect().height : 0,
      };
    });

    const PX_PER_MM = 3.78;
    const selectedTopPx = parseFloat(m.top || '16') * PX_PER_MM;
    const selectedBottomPx = parseFloat(m.bottom || '16') * PX_PER_MM;

    console.log(`[PDF] header=${dims.headerHeight}px, footer=${dims.footerHeight}px`);
    console.log(`[PDF] topMargin=${selectedTopPx.toFixed(1)}px, bottomMargin=${selectedBottomPx.toFixed(1)}px`);

    // Table thead/tfoot trick: browsers repeat <thead> at the top and
    // <tfoot> at the bottom of every printed page. We wrap <main> inside
    // a table and use invisible thead/tfoot spacers whose
    // height = header/footerHeight + selected margin. This reserves
    // space on EVERY page so content never overlaps the fixed header/footer.
    // @page margin: 0 so the fixed header/footer sit at the sheet edges.
    await page.evaluate(
      (hH: number, fH: number, topPx: number, bottomPx: number) => {
        const main = document.querySelector('main');
        if (!main) return;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Thead spacer — reserves header + top margin on every page
        const thead = document.createElement('thead');
        const theadRow = document.createElement('tr');
        const theadCell = document.createElement('td');
        theadCell.style.height = `${hH + topPx}px`;
        theadCell.style.padding = '0';
        theadCell.style.border = 'none';
        theadCell.style.lineHeight = '0';
        theadCell.style.fontSize = '0';
        theadRow.appendChild(theadCell);
        thead.appendChild(theadRow);

        // Tfoot spacer — reserves footer + bottom margin on every page
        const tfoot = document.createElement('tfoot');
        const tfootRow = document.createElement('tr');
        const tfootCell = document.createElement('td');
        tfootCell.style.height = `${fH + bottomPx}px`;
        tfootCell.style.padding = '0';
        tfootCell.style.border = 'none';
        tfootCell.style.lineHeight = '0';
        tfootCell.style.fontSize = '0';
        tfootRow.appendChild(tfootCell);
        tfoot.appendChild(tfootRow);

        // Tbody — wrap the entire <main> element
        const tbody = document.createElement('tbody');
        const tbodyRow = document.createElement('tr');
        const tbodyCell = document.createElement('td');
        tbodyCell.style.padding = '0';
        tbodyCell.style.border = 'none';
        tbodyCell.style.verticalAlign = 'top';

        // Insert table before main, move main into the tbody cell
        main.parentNode!.insertBefore(table, main);
        tbodyCell.appendChild(main);
        tbodyRow.appendChild(tbodyCell);
        tbody.appendChild(tbodyRow);

        table.appendChild(thead);
        table.appendChild(tbody);
        table.appendChild(tfoot);
      },
      0,
      0,
      selectedTopPx,
      selectedBottomPx
    );

    // Add @page with zero margins and ensure header/footer at sheet edges
    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        header { top: 0 !important; left: 0 !important; width: 100% !important; }
        footer { bottom: 0 !important; left: 0 !important; width: 100% !important; }
      `,
    });

    const puppeteerPdfOptions: PDFOptions = {
      format: pdfOptions.format || 'A4',
      landscape: pdfOptions.landscape || false,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    };

    // Check if template uses page numbers
    const hasPageNumbers = await page.evaluate(() =>
      document.querySelectorAll('.page-number, .total-pages').length > 0
    );

    if (hasPageNumbers) {
      // Generate once to count pages
      const countBuffer = await page.pdf(puppeteerPdfOptions);
      const countPdf = await PDFDocument.load(countBuffer);
      const totalPages = countPdf.getPageCount();

      // Set total pages text
      await page.evaluate((total: number) => {
        document.querySelectorAll('.total-pages').forEach(el => { el.textContent = String(total); });
      }, totalPages);

      // Generate each page with the correct page number, then merge
      const mergedPdf = await PDFDocument.create();
      for (let i = 1; i <= totalPages; i++) {
        await page.evaluate((num: number) => {
          document.querySelectorAll('.page-number').forEach(el => { el.textContent = String(num); });
        }, i);
        const singleBuf = await page.pdf({ ...puppeteerPdfOptions, pageRanges: String(i) });
        const singlePdf = await PDFDocument.load(singleBuf);
        const [copied] = await mergedPdf.copyPages(singlePdf, [0]);
        mergedPdf.addPage(copied);
      }
      return Buffer.from(await mergedPdf.save());
    }

    const pdfBuffer = await page.pdf(puppeteerPdfOptions);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}
