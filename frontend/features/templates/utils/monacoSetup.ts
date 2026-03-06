/**
 * Monaco Editor setup — registers HTML / Tailwind / Mustache IntelliSense
 * providers for the template editor.
 *
 * Call `registerTemplateProviders(monaco)` once (e.g. in `beforeMount`).
 * The function is idempotent — repeated calls are no-ops.
 */

import type { Monaco } from '@monaco-editor/react';
import type { editor, Position } from 'monaco-editor';
import { TAILWIND_CLASSES } from './tailwindClasses';

let registered = false;

// ── Mustache template variables available in the template engine ────

const TEMPLATE_VARIABLES: { label: string; detail: string; insertText: string }[] = [
  // Company
  { label: 'company.name', detail: 'Company name', insertText: 'company.name' },
  { label: 'company.street', detail: 'Company street', insertText: 'company.street' },
  { label: 'company.city', detail: 'Company city', insertText: 'company.city' },
  { label: 'company.zip_code', detail: 'Company zip code', insertText: 'company.zip_code' },
  { label: 'company.country', detail: 'Company country', insertText: 'company.country' },
  { label: 'company.email', detail: 'Company email', insertText: 'company.email' },
  { label: 'company.phone', detail: 'Company phone', insertText: 'company.phone' },
  { label: 'company.logo_url', detail: 'Company logo URL', insertText: 'company.logo_url' },
  { label: 'company.vat_number', detail: 'Company VAT number', insertText: 'company.vat_number' },
  { label: 'company.coc_number', detail: 'Company CoC number', insertText: 'company.coc_number' },
  // Customer
  { label: 'customer.name', detail: 'Customer name', insertText: 'customer.name' },
  { label: 'customer.street', detail: 'Customer street', insertText: 'customer.street' },
  { label: 'customer.city', detail: 'Customer city', insertText: 'customer.city' },
  { label: 'customer.zip_code', detail: 'Customer zip code', insertText: 'customer.zip_code' },
  { label: 'customer.country', detail: 'Customer country', insertText: 'customer.country' },
  // Invoice
  { label: 'invoice.invoice_code', detail: 'Invoice code', insertText: 'invoice.invoice_code' },
  { label: 'invoice.issue_date', detail: 'Issue date (raw)', insertText: 'invoice.issue_date' },
  { label: 'invoice.due_date', detail: 'Due date (raw)', insertText: 'invoice.due_date' },
  { label: 'invoice.status', detail: 'Invoice status', insertText: 'invoice.status' },
  { label: 'invoice.notes', detail: 'Invoice notes', insertText: 'invoice.notes' },
  { label: 'invoice.terms', detail: 'Invoice terms', insertText: 'invoice.terms' },
  { label: 'invoice.subtotal_amount', detail: 'Subtotal amount (raw)', insertText: 'invoice.subtotal_amount' },
  { label: 'invoice.discount_amount', detail: 'Discount amount (raw)', insertText: 'invoice.discount_amount' },
  { label: 'invoice.discount_is_percent', detail: 'Is discount percent?', insertText: 'invoice.discount_is_percent' },
  { label: 'invoice.discount', detail: 'Discount display (e.g. 10%)', insertText: 'invoice.discount' },
  { label: 'invoice.tax_amount', detail: 'Tax amount (raw)', insertText: 'invoice.tax_amount' },
  { label: 'invoice.tax_is_percent', detail: 'Is tax percent?', insertText: 'invoice.tax_is_percent' },
  { label: 'invoice.tax', detail: 'Tax display (e.g. 21%)', insertText: 'invoice.tax' },
  { label: 'invoice.shipping_amount', detail: 'Shipping amount (raw)', insertText: 'invoice.shipping_amount' },
  { label: 'invoice.shipping_is_percent', detail: 'Is shipping percent?', insertText: 'invoice.shipping_is_percent' },
  { label: 'invoice.shipping', detail: 'Shipping display', insertText: 'invoice.shipping' },
  { label: 'invoice.total_amount', detail: 'Total amount (raw)', insertText: 'invoice.total_amount' },
  // Formatted dates
  { label: 'date.issue_date', detail: 'Formatted issue date', insertText: 'date.issue_date' },
  { label: 'date.due_date', detail: 'Formatted due date', insertText: 'date.due_date' },
  // Formatted currency values
  { label: 'fc.subtotal_amount', detail: 'Subtotal (formatted)', insertText: 'fc.subtotal_amount' },
  { label: 'fc.discount_total_amount', detail: 'Discount total (formatted)', insertText: 'fc.discount_total_amount' },
  { label: 'fc.tax_total_amount', detail: 'Tax total (formatted)', insertText: 'fc.tax_total_amount' },
  { label: 'fc.shipping_total_amount', detail: 'Shipping total (formatted)', insertText: 'fc.shipping_total_amount' },
  { label: 'fc.total_amount', detail: 'Total (formatted)', insertText: 'fc.total_amount' },
  // Language / translation labels
  { label: 'lang.invoiceTitle', detail: 'Translated "Invoice" title', insertText: 'lang.invoiceTitle' },
  { label: 'lang.billTo', detail: 'Translated "Bill To"', insertText: 'lang.billTo' },
  { label: 'lang.issueDate', detail: 'Translated "Issue Date"', insertText: 'lang.issueDate' },
  { label: 'lang.dueDate', detail: 'Translated "Due Date"', insertText: 'lang.dueDate' },
  { label: 'lang.item', detail: 'Translated "Item"', insertText: 'lang.item' },
  { label: 'lang.quantity', detail: 'Translated "Quantity"', insertText: 'lang.quantity' },
  { label: 'lang.rate', detail: 'Translated "Rate"', insertText: 'lang.rate' },
  { label: 'lang.amount', detail: 'Translated "Amount"', insertText: 'lang.amount' },
  { label: 'lang.subtotal', detail: 'Translated "Subtotal"', insertText: 'lang.subtotal' },
  { label: 'lang.discount_label', detail: 'Translated "Discount"', insertText: 'lang.discount_label' },
  { label: 'lang.tax_label', detail: 'Translated "Tax"', insertText: 'lang.tax_label' },
  { label: 'lang.shipping_label', detail: 'Translated "Shipping"', insertText: 'lang.shipping_label' },
  { label: 'lang.total', detail: 'Translated "Total"', insertText: 'lang.total' },
  { label: 'lang.notes', detail: 'Translated "Notes"', insertText: 'lang.notes' },
  { label: 'lang.terms', detail: 'Translated "Terms"', insertText: 'lang.terms' },
  { label: 'lang.vatNumber', detail: 'Translated "VAT Number"', insertText: 'lang.vatNumber' },
  { label: 'lang.cocNumber', detail: 'Translated "CoC Number"', insertText: 'lang.cocNumber' },
];

// Item-level variables (inside {{#each items in item}} … {{/each}})
const ITEM_VARIABLES: { label: string; detail: string; insertText: string }[] = [
  { label: 'item.name', detail: 'Item name', insertText: 'item.name' },
  { label: 'item.quantity', detail: 'Item quantity', insertText: 'item.quantity' },
  { label: 'item.unit_price', detail: 'Item unit price (raw)', insertText: 'item.unit_price' },
  { label: 'item.amount', detail: 'Item total (formatted)', insertText: 'item.amount' },
  { label: 'item.fc.unit_price', detail: 'Item unit price (formatted)', insertText: 'item.fc.unit_price' },
  { label: 'item.fc.amount', detail: 'Item total (formatted)', insertText: 'item.fc.amount' },
];

// Mustache block snippets
const MUSTACHE_SNIPPETS: { label: string; detail: string; insertText: string }[] = [
  {
    label: '#if … /if',
    detail: 'Conditional block',
    insertText: '{{#if ${1:condition}}}\\n  $0\\n{{/if}}',
  },
  {
    label: '#if … else … /if',
    detail: 'Conditional with else',
    insertText: '{{#if ${1:condition}}}\\n  $2\\n{{else}}\\n  $0\\n{{/if}}',
  },
  {
    label: '#each items in item',
    detail: 'Loop over invoice items',
    insertText: '{{#each items in item}}\\n  $0\\n{{/each}}',
  },
];

// ── Registration ────────────────────────────────────────────────────

export function registerTemplateProviders(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  // ── 1. Tailwind CSS class completion ──────────────────────────────

  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['"', "'", ' ', '-'],

    provideCompletionItems(model: editor.ITextModel, position: Position) {
      // Check whether the cursor is inside a class="…" attribute value
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Match class="...<cursor>  or  class='...<cursor>
      const classMatch = textUntilPosition.match(/class\s*=\s*["'][^"']*$/);
      if (!classMatch) return { suggestions: [] };

      // Also include the hyphenated prefix (Monaco word boundary stops at `-`)
      const wordInfo = model.getWordUntilPosition(position);
      const lineContent = model.getLineContent(position.lineNumber);
      let startCol = wordInfo.startColumn;
      while (startCol > 1 && /[\w-]/.test(lineContent[startCol - 2])) {
        startCol--;
      }
      const replaceRange = {
        startLineNumber: position.lineNumber,
        startColumn: startCol,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      const typed = lineContent.slice(startCol - 1, wordInfo.endColumn - 1).toLowerCase();

      const suggestions = TAILWIND_CLASSES
        .filter(c => !typed || c.name.toLowerCase().startsWith(typed) || c.name.toLowerCase().includes(typed))
        .slice(0, 200) // cap for performance
        .map((c, i) => ({
          label: c.name,
          kind: monaco.languages.CompletionItemKind.Value,
          detail: c.detail,
          insertText: c.name,
          range: replaceRange,
          sortText: String(i).padStart(5, '0'),
        }));

      return { suggestions };
    },
  });

  // ── 2. Mustache / template variable completion ────────────────────

  monaco.languages.registerCompletionItemProvider('html', {
    triggerCharacters: ['{', ' ', '.'],

    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Are we inside {{ … }} ?
      const mustacheMatch = textUntilPosition.match(/\{\{\s*#?[^}]*$/);
      if (!mustacheMatch) return { suggestions: [] };

      const wordInfo = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      // Include dots in the typed prefix
      const lineContent = model.getLineContent(position.lineNumber);
      let startCol = wordInfo.startColumn;
      while (startCol > 1 && /[\w.]/.test(lineContent[startCol - 2])) {
        startCol--;
      }
      const replaceRange = {
        startLineNumber: position.lineNumber,
        startColumn: startCol,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      const typed = lineContent.slice(startCol - 1, wordInfo.endColumn - 1).toLowerCase();

      // Determine if we're inside an {{#each}} block for item-level vars
      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);
      const before = fullText.slice(0, offset);
      const inEachBlock =
        (before.match(/\{\{#each/g) || []).length >
        (before.match(/\{\{\/each\}\}/g) || []).length;

      // Check if we're after {{ or {{# for snippet suggestions
      const isBlockStart = /\{\{\s*#\s*$/.test(textUntilPosition) || /\{\{\s*$/.test(textUntilPosition);

      const allVars = [
        ...TEMPLATE_VARIABLES,
        ...(inEachBlock ? ITEM_VARIABLES : []),
      ];

      const suggestions = [
        // Variable completions
        ...allVars
          .filter(v => !typed || v.label.toLowerCase().startsWith(typed) || v.label.toLowerCase().includes(typed))
          .map((v, i) => ({
            label: v.label,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: v.detail,
            insertText: v.insertText,
            range: replaceRange,
            sortText: `0${String(i).padStart(4, '0')}`,
          })),
        // Snippet completions (block helpers)
        ...(isBlockStart
          ? MUSTACHE_SNIPPETS.map((s, i) => ({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: s.detail,
              insertText: s.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              sortText: `1${String(i).padStart(4, '0')}`,
            }))
          : []),
      ];

      return { suggestions };
    },
  });

  // ── 3. Hover info for Mustache variables ──────────────────────────

  monaco.languages.registerHoverProvider('html', {
    provideHover(model: editor.ITextModel, position: Position) {
      const line = model.getLineContent(position.lineNumber);
      // Find {{ var }} at cursor position
      const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const start = match.index + match[0].indexOf(match[1]);
        const end = start + match[1].length;
        if (position.column >= start + 1 && position.column <= end + 1) {
          const varName = match[1];
          const entry = [...TEMPLATE_VARIABLES, ...ITEM_VARIABLES].find(v => v.label === varName);
          if (entry) {
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: start + 1,
                endLineNumber: position.lineNumber,
                endColumn: end + 1,
              },
              contents: [
                { value: `**\`{{ ${entry.label} }}\`**` },
                { value: entry.detail },
              ],
            };
          }
        }
      }
      return null;
    },
  });
}
