'use server';

import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
      dims.headerHeight,
      dims.footerHeight,
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
      // Pass 1: generate PDF to count actual pages
      const countBuf = await page.pdf(puppeteerPdfOptions);
      const countDoc = await PDFDocument.load(countBuf);
      const totalPages = countDoc.getPageCount();

      // Fill spans with text for layout measurement, then capture positions
      const spanMeta = await page.evaluate((total: number) => {
        document.querySelectorAll('.page-number').forEach(el => {
          (el as HTMLElement).textContent = String(total);
        });
        document.querySelectorAll('.total-pages').forEach(el => {
          (el as HTMLElement).textContent = String(total);
        });

        const result: { type: 'pn' | 'tp'; x: number; y: number; w: number; h: number; fontSize: number; color: string }[] = [];
        document.querySelectorAll('.page-number, .total-pages').forEach(el => {
          const rect = (el as HTMLElement).getBoundingClientRect();
          const style = getComputedStyle(el as HTMLElement);
          result.push({
            type: el.classList.contains('page-number') ? 'pn' : 'tp',
            x: rect.x, y: rect.y, w: rect.width, h: rect.height,
            fontSize: parseFloat(style.fontSize),
            color: style.color,
          });
        });

        // Hide text so PDF renders clean placeholders (layout preserved)
        document.querySelectorAll('.page-number, .total-pages').forEach(el => {
          (el as HTMLElement).style.color = 'transparent';
        });

        return result;
      }, totalPages);

      // Pass 2: generate final PDF with invisible placeholders
      const pdfBytes = await page.pdf(puppeteerPdfOptions);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pdfPages = pdfDoc.getPages();
      const S = 72 / 96; // CSS px → PDF pt

      // Stamp correct page numbers onto each page
      for (let i = 0; i < pdfPages.length; i++) {
        const pg = pdfPages[i];
        const { height: pgH } = pg.getSize();
        for (const span of spanMeta) {
          const text = span.type === 'pn' ? String(i + 1) : String(totalPages);
          const fs = span.fontSize * S;
          const tw = font.widthOfTextAtSize(text, fs);
          // Center text within the measured span area
          const x = span.x * S + (span.w * S - tw) / 2;
          // Baseline: top of span + height - descent (≈ 20% of fontSize)
          const y = pgH - (span.y + span.h - span.fontSize * 0.2) * S;
          // Parse computed color (rgb/rgba)
          const c = (span.color.match(/[\d.]+/g) || ['148', '163', '184']).map(Number);
          pg.drawText(text, {
            x, y, size: fs, font,
            color: rgb(c[0] / 255, c[1] / 255, c[2] / 255),
          });
        }
      }

      return Buffer.from(await pdfDoc.save());
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
