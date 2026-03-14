/**
 * Mustache-like Template Interpolation Engine
 *
 * Renders a template string with invoice data, translations and formatting.
 *
 * Supported tags:
 *   {{ company.name }}          → invoice.company?.name || ''
 *   {{ invoice.invoice_code }}  → invoice.invoice_code || ''
 *   {{ customer.name }}         → invoice.customer_name || ''
 *   {{ lang.invoiceTitle }}       → tl(labels, 'invoiceTitle')
 *   {{ date.issue_date }}       → formatted invoice.issue_date
 *   {{ date.due_date }}         → formatted invoice.due_date
 *   {{ fc.subtotal_amount }}    → currency-formatted invoice field
 *   {{#if company.logo_url}}...{{/if}}            → conditional block
 *   {{#if company.logo_url}}...{{else}}...{{/if}} → if/else block
 *   {{#each items in item}} ... {{/each}}          → iterate items
 *     inside each: {{ item.name }}, {{ item.quantity }},
 *                  {{ item.unit_price }}, {{ item.amount }}
 *                  {{ item.fc.unit_price }}, {{ item.fc.amount }}
 *
 * @module features/invoice/utils/templateEngine
 */

import { format } from 'date-fns';
import { dateFormats } from '@/config/formatting';
import { formatWithCurrency } from '@/config/formatting';
import { tl } from '@/lib/i18n/translate';
import type { Translations } from '@/lib/i18n/translate';
import type { InvoiceWithItems, InvoiceItem } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Resolve a dotted path to a value in a nested object.
 */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ── Core engine ────────────────────────────────────────────────────

/**
 * Render a mustache-like template string with the given context.
 */
export function renderTemplate(
  tpl: string,
  invoice: InvoiceWithItems,
  labels: Translations,
): string {
  const fd = (date: string | null) => {
    try { return date ? format(new Date(date), dateFormats.pdf) : ''; }
    catch { return date || ''; }
  };
  const fc = (amount: string | number) => formatWithCurrency(invoice.currency, amount);

  // Unified namespace map — single object, O(1) lookups
  const ns: Record<string, Record<string, unknown>> = {
    company: {
      name: invoice.company?.name,
      street: invoice.company?.street,
      city: invoice.company?.city,
      zip_code: invoice.company?.zip_code,
      country: invoice.company?.country,
      email: invoice.company?.email,
      phone: invoice.company?.phone,
      logo_url: invoice.company?.logo_url,
      vat_number: invoice.company?.vat_number,
      coc_number: invoice.company?.coc_number,
    },
    customer: {
      name: invoice.customer_name,
      street: invoice.customer_street,
      city: invoice.customer_city,
      zip_code: invoice.customer_zip_code,
      country: invoice.customer_country,
    },
    invoice: {
      invoice_code: invoice.invoice_code,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      notes: invoice.notes,
      terms: invoice.terms,
      subtotal_amount: invoice.subtotal_amount,
      discount_amount: invoice.discount_amount,
      discount_type: invoice.discount_type,
      discount_total_amount: invoice.discount_total_amount,
      tax_amount: invoice.tax_amount,
      tax_type: invoice.tax_type,
      tax_total_amount: invoice.tax_total_amount,
      shipping_amount: invoice.shipping_amount,
      shipping_type: invoice.shipping_type,
      shipping_total_amount: invoice.shipping_total_amount,
      total_amount: invoice.total_amount,
      discount: invoice.discount_amount
        ? invoice.discount_type === 'percent'
          ? `${invoice.discount_amount}%`
          : String(invoice.discount_amount)
        : '',
      discount_is_percent: invoice.discount_type === 'percent' && !!invoice.discount_amount,
      tax: invoice.tax_amount
        ? invoice.tax_type === 'percent'
          ? `${invoice.tax_amount}%`
          : String(invoice.tax_amount)
        : '',
      tax_is_percent: invoice.tax_type === 'percent' && !!invoice.tax_amount,
      shipping: invoice.shipping_amount ? String(invoice.shipping_amount) : '',
      shipping_is_percent: invoice.shipping_type === 'percent' && !!invoice.shipping_amount,
    },
  };

  const invoiceMap = ns.invoice;
  let result = tpl;

  // ── 1. {{#each <collection> in <var>}} ... {{/each}} ──
  result = result.replace(
    /\{\{#each\s+(\w+)\s+in\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, collection: string, varName: string, itemTpl: string) => {
      if (collection !== 'items') return '';
      // Pre-compile regexes once, reused across all items
      const fcRe = new RegExp(`\\{\\{\\s*${varName}\\.fc\\.(\\w+)\\s*\\}\\}`, 'g');
      const valRe = new RegExp(`\\{\\{\\s*${varName}\\.(\\w+)\\s*\\}\\}`, 'g');
      return invoice.items.map((item: InvoiceItem) => {
        const amt = (item.quantity * item.unit_price).toFixed(2);
        return itemTpl
          .replace(fcRe, (__, key: string) => {
            if (key === 'unit_price') return fc(item.unit_price.toFixed(2));
            if (key === 'amount') return fc(amt);
            return '';
          })
          .replace(valRe, (__, key: string) => {
            if (key === 'amount') return fc(amt);
            const val = (item as unknown as Record<string, unknown>)[key];
            return val != null ? String(val) : '';
          });
      }).join('');
    }
  );

  // ── 2. {{#if}}...{{else}}...{{/if}} — resolve innermost first ──
  {
    const ifRe = /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g;
    for (let i = 0; i < 20 && ifRe.test(result); i++) {
      ifRe.lastIndex = 0;
      result = result.replace(ifRe, (_, path: string, body: string) => {
        const dot = path.indexOf('.');
        const map = dot !== -1 ? ns[path.slice(0, dot)] : undefined;
        const value = map ? map[path.slice(dot + 1)] : undefined;
        const parts = body.split(/\{\{else\}\}/);
        return (value && value !== '' && value !== 0) ? parts[0] : (parts[1] || '');
      });
    }
  }

  // ── 3. All remaining {{ ns.key }} tags in a single pass ──
  result = result.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const dot = path.indexOf('.');
    if (dot === -1) return '';
    const namespace = path.slice(0, dot);
    const key = path.slice(dot + 1);

    switch (namespace) {
      case 'lang': return tl(labels, key) || '';
      case 'date':
        if (key === 'issue_date') return fd(invoice.issue_date);
        if (key === 'due_date') return fd(invoice.due_date);
        return '';
      case 'page':
        if (key === 'number') return '<span class="page-number"></span>';
        if (key === 'total') return '<span class="total-pages"></span>';
        return '';
      case 'fc': {
        const val = invoiceMap[key];
        return val != null ? fc(Number(val).toFixed(2)) : '';
      }
      default: {
        const map = ns[namespace];
        if (!map) return '';
        const val = map[key];
        return val != null ? String(val) : '';
      }
    }
  });

  return result;
}

// ── Custom-template helpers ────────────────────────────────────────

/**
 * Replace English labels in rendered HTML with translated versions.
 * Used only for custom templates (the default template uses {{ lang.* }} tags).
 */
export function translateCustomHtml(html: string, labels: Translations): string {
  const replacements: [string, string, boolean?][] = [
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
    ['VAT:', 'preview.vatNumber', true],
    ['CoC:', 'preview.cocNumber', true],
  ];

  let result = html;
  for (const [en, key, keepColon] of replacements) {
    const translated = tl(labels, key);
    if (translated && translated !== key && translated !== en) {
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(>[^<]*)${escaped}([^<]*<)`, 'g');
      const replacement = keepColon ? `${translated}:` : translated;
      result = result.replace(regex, `$1${replacement}$2`);
    }
  }
  return result;
}

/**
 * Wrap rendered invoice HTML in a complete HTML document with styles.
 * Used for custom templates that only provide body content.
 */
export function customInvoiceHtml(bodyContent: string, options?: {
  preview?: boolean;
  margins?: { top: string; right: string; bottom: string; left: string };
}): string {

  const previewScript = options?.preview ? `
    <script>
    (function(){
      var A4=1123,W=794,GAP=16,ran=false;
      var SKIP={SCRIPT:1,STYLE:1,LINK:1};
      function paginate(){
        if(ran)return;
        ran=true;
        // Detect <header> and <footer> tags in the body
        var hdrEl=document.body.querySelector('header');
        var ftrEl=document.body.querySelector('footer');
        var hdrH=hdrEl?hdrEl.getBoundingClientRect().height:0;
        var ftrH=ftrEl?ftrEl.getBoundingClientRect().height:0;
        // Find root content element (skip header/footer/script/style/link)
        var root=null;
        for(var c=document.body.firstElementChild;c;c=c.nextElementSibling){
          if(!SKIP[c.tagName]&&c.tagName!=='HEADER'&&c.tagName!=='FOOTER'){root=c;break;}
        }
        if(!root){ran=false;return;}
        // Measure content
        var rootStyle=getComputedStyle(root);
        var PT=parseFloat(rootStyle.paddingTop)||0;
        var PB=parseFloat(rootStyle.paddingBottom)||0;
        var PL=parseFloat(rootStyle.paddingLeft)||0;
        var rr=root.getBoundingClientRect();
        var CW=Math.round(rr.width-2*PL);
        var contentH=Math.round(rr.height-PT-PB);
        var topSpace=Math.max(hdrH,PT);
        var bottomSpace=Math.max(ftrH,PB);
        var CH=A4-topSpace-bottomSpace;
        if(contentH<10){ran=false;return;}
        // Fill page-number / total-pages spans for single or multi-page
        function fillPageSpans(container,pageNum,totalPages){
          var pn=container.querySelectorAll('.page-number');
          for(var x=0;x<pn.length;x++)pn[x].textContent=String(pageNum);
          var tp=container.querySelectorAll('.total-pages');
          for(var x2=0;x2<tp.length;x2++)tp[x2].textContent=String(totalPages);
        }
        // Single page — no splitting needed
        if(contentH<=CH){
          fillPageSpans(document.body,1,1);
          document.body.style.minHeight=A4+'px';
          window.parent.postMessage({type:'previewSize',height:A4,pages:1},'*');
          return;
        }
        // Collect break-point boundaries
        var set=new Set(),top=rr.top+PT,stack=[];
        for(var ci=0;ci<root.children.length;ci++)stack.push([root.children[ci],0]);
        while(stack.length){
          var pair=stack.pop(),el=pair[0],d=pair[1];
          set.add(Math.round(el.getBoundingClientRect().top-top));
          if(d<3&&el.children.length>1){
            for(var j=0;j<el.children.length;j++)stack.push([el.children[j],d+1]);
          }
        }
        set.add(contentH);
        var bounds=Array.from(set).sort(function(a,b){return a-b});
        // Determine page break positions
        var breaks=[0],pos=0;
        while(pos+CH<contentH){
          var target=pos+CH,best=target;
          for(var k=bounds.length-1;k>=0;k--){
            if(bounds[k]<=target&&bounds[k]>pos){best=bounds[k];break;}
          }
          breaks.push(best);
          pos=best;
        }
        var pages=breaks.length;
        // Clone content children (inside root, without root padding wrapper)
        var contentClone=document.createElement('div');
        for(var ci2=0;ci2<root.children.length;ci2++)contentClone.appendChild(root.children[ci2].cloneNode(true));
        // Preserve flex/gap from root
        var rootGap=rootStyle.gap||'0px';
        contentClone.style.cssText='display:flex;flex-direction:column;gap:'+rootGap;
        // Clone header/footer for reuse
        var hdrClone=hdrEl?hdrEl.cloneNode(true):null;
        var ftrClone=ftrEl?ftrEl.cloneNode(true):null;
        // Clear body
        var n=document.body.firstChild;
        while(n){var nx=n.nextSibling;if(!(n.nodeType===1&&SKIP[n.tagName]))n.remove();n=nx;}
        document.documentElement.style.background='transparent';
        document.body.style.cssText='font-family:Inter,sans-serif;margin:0;padding:'+GAP+'px;display:flex;flex-direction:column;gap:'+GAP+'px;align-items:center;background:transparent';
        // Build pages
        var frag=document.createDocumentFragment();
        var pageCSS='width:'+W+'px;height:'+A4+'px;overflow:hidden;background:white;flex-shrink:0;position:relative;box-shadow:0 2px 16px rgba(0,0,0,0.08);border-radius:2px';
        for(var i=0;i<pages;i++){
          var page=document.createElement('div');
          page.style.cssText=pageCSS;
          // Header
          if(hdrClone){
            var hc=hdrClone.cloneNode(true);
            hc.style.position='absolute';hc.style.top='0';hc.style.left='0';hc.style.width=W+'px';
            fillPageSpans(hc,i+1,pages);
            page.appendChild(hc);
          }
          // Footer
          if(ftrClone){
            var fc=ftrClone.cloneNode(true);
            fc.style.position='absolute';fc.style.bottom='0';fc.style.left='0';fc.style.width=W+'px';
            fillPageSpans(fc,i+1,pages);
            page.appendChild(fc);
          }
          // Content viewport
          var vpH=i<pages-1?breaks[i+1]-breaks[i]:Math.min(CH,contentH-breaks[i]);
          var vp=document.createElement('div');
          vp.style.cssText='position:absolute;top:'+topSpace+'px;left:'+PL+'px;width:'+CW+'px;height:'+vpH+'px;overflow:hidden';
          var ct=document.createElement('div');
          ct.appendChild(contentClone.cloneNode(true));
          ct.style.cssText='position:absolute;top:'+(-breaks[i])+'px;left:0;width:'+CW+'px';
          vp.appendChild(ct);
          page.appendChild(vp);
          frag.appendChild(page);
        }
        document.body.appendChild(frag);
        window.parent.postMessage({type:'previewSize',height:pages*A4+(pages+1)*GAP,pages:pages},'*');
      }
      function run(){requestAnimationFrame(function(){setTimeout(paginate,100)})}
      document.fonts&&document.fonts.ready?document.fonts.ready.then(run):document.readyState==='complete'?run():window.addEventListener('load',run);
    })();
    </script>` : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      <style>
        @layer base {
          * {
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            // outline: solid red 1px;
          }
          main > div:last-child {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          ${options?.margins ? `
          main {
            padding: ${options.margins.top} ${options.margins.right} ${options.margins.bottom} ${options.margins.left} !important;
          }
          header {
            padding-left: ${options.margins.left} !important;
            padding-right: ${options.margins.right} !important;
          }
          footer {
            padding-left: ${options.margins.left} !important;
            padding-right: ${options.margins.right} !important;
          }
          ` : ''}
        }
      </style>
    </head>
    <body>
      ${bodyContent}
      ${previewScript}
    </body>
    </html>
  `;
}

/**
 * The default invoice template body (mustache syntax).
 * This is the content that goes inside <body> and is also stored in the DB.
 * Exported so the test page editor can use it as a starting point.
 */
export const DEFAULT_TEMPLATE_STYLING = `
<header class="absolute top-0 left-0 w-full bg-slate-900 px-[16mm] py-6 flex items-center justify-between">
  <div class="flex items-center gap-4">
    {{#if company.logo_url}}
      <img src="{{ company.logo_url }}" alt="Logo" class="h-12 brightness-0 invert" />
    {{/if}}
    <span class="text-xl font-bold text-white">{{ company.name }}</span>
  </div>
  <div class="text-right">
    <h2 class="text-2xl font-bold text-white">{{ lang.invoiceTitle }}</h2>
    <p class="text-base text-slate-300 font-semibold">#{{ invoice.invoice_code }}</p>
  </div>
</header>
<main class="w-full h-full bg-transparent flex flex-col gap-8 p-[16mm]">
  <div class="flex justify-between">
    <div class="flex flex-col">
      {{#if company.street}}<p class="text-sm text-gray-600">{{ company.street }}</p>{{/if}}
      {{#if company.city}}<p class="text-sm text-gray-600">{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}
      {{#if company.country}}<p class="text-sm text-gray-600">{{ company.country }}</p>{{/if}}
      {{#if company.email}}<p class="text-sm text-gray-600">{{ company.email }}</p>{{/if}}
      {{#if company.phone}}<p class="text-sm text-gray-600">{{ company.phone }}</p>{{/if}}
      {{#if company.vat_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.vatNumber }}:</span> {{ company.vat_number }}</p>{{/if}}
      {{#if company.coc_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.cocNumber }}:</span> {{ company.coc_number }}</p>{{/if}}
    </div>
    <div class="flex flex-col gap-1">
      {{#if invoice.issue_date}}
        <div class="flex justify-end gap-3">
          <span class="text-sm font-semibold text-gray-600">{{ lang.issueDate }}:</span>
          <span class="text-sm text-gray-900">{{ date.issue_date }}</span>
        </div>
      {{/if}}
      {{#if invoice.due_date}}
        <div class="flex justify-end gap-3">
          <span class="text-sm font-semibold text-gray-600">{{ lang.dueDate }}:</span>
          <span class="text-sm text-gray-900">{{ date.due_date }}</span>
        </div>
      {{/if}}
    </div>
  </div>

  <hr class="border-1 border-gray-200"/>

  <!-- Bill To -->
  <div class="flex flex-col">
    <h3 class="text-xs font-bold uppercase text-gray-600">{{ lang.billTo }}:</h3>
    <p class="text-lg font-semibold text-gray-900">{{ customer.name }}</p>
    {{#if customer.street}}<p class="text-sm text-gray-600">{{ customer.street }}</p>{{/if}}
    {{#if customer.city}}<p class="text-sm text-gray-600">{{ customer.city }}</p>{{/if}}
    {{#if customer.country}}<p class="text-sm text-gray-600">{{ customer.country }}</p>{{/if}}
  </div>

  <!-- Items Table -->
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-12 bg-slate-900 text-white rounded py-3 px-2">
      <div class="col-span-5 text-sm font-bold uppercase">{{ lang.item }}</div>
      <div class="col-span-2 text-sm font-bold uppercase text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-sm font-bold uppercase text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-sm font-bold uppercase text-right">{{ lang.amount }}</div>
    </div>
    {{#each items in item}}
      <div class="grid grid-cols-12 px-2">
        <span class="col-span-5 text-slate-700">{{ item.name }}</span>
        <span class="col-span-2 text-slate-700 text-center">{{ item.quantity }}</span>
        <span class="col-span-2 text-slate-700 text-right">{{ item.fc.unit_price }}</span>
        <span class="col-span-3 text-slate-900 font-semibold text-right">{{ item.fc.amount }}</span>
      </div>
    {{/each}}
  </div>

  <div class="grid grid-cols-2 gap-8 grow content-end">
    <!-- Terms & Notes -->
    <div class="flex flex-col gap-8">
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.notes }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.notes }}</p>
      </div>
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.terms }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.terms }}</p>
      </div>
    </div>

    <!-- Totals -->
    <div class="flex flex-col gap-4">
      <div class="flex justify-between text-slate-700">
        <span class="font-semibold text-gray-700">{{ lang.subtotal }}:</span>
        <span class="font-semibold text-gray-900">{{ fc.subtotal_amount }}</span>
      </div>
      {{#if invoice.discount_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.discount_label }}{{#if invoice.discount_is_percent}} ({{ invoice.discount }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">-{{ fc.discount_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.tax_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.tax_label }}{{#if invoice.tax_is_percent}} ({{ invoice.tax }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.tax_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.shipping_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.shipping_label }}{{#if invoice.shipping_is_percent}} ({{ invoice.shipping }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.shipping_total_amount }}</span>
        </div>
      {{/if}}
      <div class="flex justify-between items-center pt-2 border-t">
        <span class="text-xl font-bold text-gray-900">{{ lang.total }}:</span>
        <span class="text-2xl font-bold text-gray-900">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>
<footer class="absolute bottom-0 left-0 w-full bg-slate-900 px-[16mm] py-4 flex items-center justify-between text-xs text-slate-400">
  <span>{{ company.name }}</span>
  <span>{{ page.number }} / {{ page.total }}</span>
  <div class="flex gap-4">
    {{#if company.email}}<span>{{ company.email }}</span>{{/if}}
    {{#if company.phone}}<span>{{ company.phone }}</span>{{/if}}
  </div>
</footer>`.trim();

/**
 * Build HTML content for the default invoice template.
 *
 * Uses {{ }} mustache-like tags so translations and data are resolved
 * automatically — no need to update JS code when adding/removing fields.
 */
export function InvoiceHtml(invoice: InvoiceWithItems, labels: Translations): string {
  const body = renderTemplate(DEFAULT_TEMPLATE_STYLING, invoice, labels);
  return customInvoiceHtml(body);
}
