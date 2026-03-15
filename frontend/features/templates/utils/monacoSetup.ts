/**
 * Monaco Editor setup — registers HTML / Tailwind / Mustache IntelliSense
 * providers for the template editor.
 *
 * Call `registerTemplateProviders(monaco)` once (e.g. in `beforeMount`).
 * The function is idempotent — repeated calls are no-ops.
 */

import type { Monaco } from '@monaco-editor/react';
import type { editor, Position, MarkerSeverity as MarkerSeverityType } from 'monaco-editor';
import { generateCompletions, resolveTailwindCSS } from './tailwindClasses';

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
  { label: 'company.bank_number', detail: 'Company bank number', insertText: 'company.bank_number' },
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
  { label: 'lang.bankNumber', detail: 'Translated "Bank Number"', insertText: 'lang.bankNumber' },
  // Page numbers
  { label: 'page.number', detail: 'Current page number', insertText: 'page.number' },
  { label: 'page.total', detail: 'Total number of pages', insertText: 'page.total' },
];

// Item-level variable suffixes (loop variable name is dynamic)
const ITEM_SUFFIXES: { suffix: string; detail: string }[] = [
  { suffix: 'name', detail: 'Item name' },
  { suffix: 'quantity', detail: 'Item quantity' },
  { suffix: 'unit_price', detail: 'Item unit price (raw)' },
  { suffix: 'amount', detail: 'Item total (formatted)' },
  { suffix: 'fc.unit_price', detail: 'Item unit price (formatted)' },
  { suffix: 'fc.amount', detail: 'Item total (formatted)' },
];

/** Build item variables using the actual loop variable name from v-for. */
function getItemVariables(varName: string): { label: string; detail: string; insertText: string }[] {
  return ITEM_SUFFIXES.map(s => ({
    label: `${varName}.${s.suffix}`,
    detail: s.detail,
    insertText: `${varName}.${s.suffix}`,
  }));
}

/** Extract the loop variable name from the nearest v-for in the text before cursor. */
function detectLoopVar(textBefore: string): string | null {
  const matches = [...textBefore.matchAll(/v-for\s*=\s*"([^"]*)"/g)];
  if (matches.length === 0) return null;
  const expr = matches[matches.length - 1][1];
  const m = expr.match(/(?:\(\s*(\w+)\s*(?:,\s*\w+\s*)*\)|(\w+))\s+in\s+/);
  return m ? (m[1] || m[2] || null) : null;
}

/** Extract all declared v-for variable names (value, index, key) from the nearest v-for. */
function detectLoopVarNames(textBefore: string): Set<string> {
  const names = new Set<string>();
  const matches = [...textBefore.matchAll(/v-for\s*=\s*"([^"]*)"/g)];
  if (matches.length === 0) return names;
  const expr = matches[matches.length - 1][1];
  const m = expr.match(/(?:\(\s*(\w+)\s*(?:,\s*(\w+)\s*(?:,\s*(\w+)\s*)?)?\)|(\w+))\s+in\s+/);
  if (m) {
    if (m[1]) names.add(m[1]);
    if (m[2]) names.add(m[2]);
    if (m[3]) names.add(m[3]);
    if (m[4]) names.add(m[4]);
  }
  return names;
}

// Directive snippets (v-if, v-for, etc.)
const DIRECTIVE_SNIPPETS: { label: string; detail: string; insertText: string }[] = [
  {
    label: 'v-if',
    detail: 'Conditional rendering',
    insertText: 'v-if="${1:condition}"',
  },
  {
    label: 'v-else-if',
    detail: 'Else-if branch',
    insertText: 'v-else-if="${1:condition}"',
  },
  {
    label: 'v-else',
    detail: 'Else branch',
    insertText: 'v-else',
  },
  {
    label: 'v-for',
    detail: 'Loop over invoice items',
    insertText: 'v-for="item in items"',
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

      const suggestions = generateCompletions(typed)
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

      // Determine if we're inside a v-for element for item-level vars
      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);
      const before = fullText.slice(0, offset);
      const inForBlock =
        (before.match(/v-for\s*=\s*"/g) || []).length >
        (before.match(/<\/\w[\w-]*>/g) || []).length * 0 || // approximate: if any v-for exists in ancestors
        /v-for\s*=\s*"[^"]*"/.test(before);

      // Check if we're after {{ or {{# for snippet suggestions
      const isBlockStart = /\{\{\s*#\s*$/.test(textUntilPosition) || /\{\{\s*$/.test(textUntilPosition);

      const loopVar = inForBlock ? detectLoopVar(before) : null;
      const loopVarNames = inForBlock ? detectLoopVarNames(before) : new Set<string>();
      const extraLoopVars: { label: string; detail: string; insertText: string }[] = [];
      for (const name of loopVarNames) {
        if (name !== loopVar) {
          extraLoopVars.push({ label: name, detail: 'Loop variable (index/key)', insertText: name });
        }
      }
      const allVars = [
        ...TEMPLATE_VARIABLES,
        ...(loopVar ? getItemVariables(loopVar) : []),
        ...extraLoopVars,
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
        // Snippet completions (directive helpers)
        ...(isBlockStart
          ? DIRECTIVE_SNIPPETS.map((s, i) => ({
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
      const fullText = model.getValue();
      const offsetAtPos = model.getOffsetAt(position);
      const textBefore = fullText.slice(0, offsetAtPos);
      const loopVar = detectLoopVar(textBefore);
      const loopVarNames = detectLoopVarNames(textBefore);

      // Find {{ expr }} at cursor position (supports arithmetic like index + 1)
      const regex = /\{\{\s*([\w.]+(?:\s*[+-]\s*\d+)?)\s*\}\}/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const exprStr = match[1];
        const start = match.index + match[0].indexOf(exprStr);
        const end = start + exprStr.length;
        if (position.column < start + 1 || position.column > end + 1) continue;

        // Check for arithmetic expression (e.g. index + 1)
        const arithMatch = exprStr.match(/^(\w+)\s*([+-])\s*(\d+)$/);
        if (arithMatch && loopVarNames.has(arithMatch[1])) {
          const name = arithMatch[1];
          return {
            range: {
              startLineNumber: position.lineNumber, startColumn: start + 1,
              endLineNumber: position.lineNumber, endColumn: end + 1,
            },
            contents: [
              { value: `**\`{{ ${exprStr} }}\`**` },
              { value: `Loop variable \`${name}\` with arithmetic offset — 0-based index ${arithMatch[2] === '+' ? 'plus' : 'minus'} ${arithMatch[3]}` },
            ],
          };
        }

        const varName = exprStr.trim();

        // Check if it's a bare loop variable (index, key)
        if (loopVarNames.has(varName) && varName !== loopVar) {
          return {
            range: {
              startLineNumber: position.lineNumber, startColumn: start + 1,
              endLineNumber: position.lineNumber, endColumn: end + 1,
            },
            contents: [
              { value: `**\`{{ ${varName} }}\`**` },
              { value: `Loop variable — 0-based numeric index` },
            ],
          };
        }

        // Check if it's the loop value variable (e.g. {{ value }} bare or {{ value.name }})
        if (loopVar && varName === loopVar) {
          return {
            range: {
              startLineNumber: position.lineNumber, startColumn: start + 1,
              endLineNumber: position.lineNumber, endColumn: end + 1,
            },
            contents: [
              { value: `**\`{{ ${varName} }}\`**` },
              { value: `Loop iteration variable — current item object` },
            ],
          };
        }

        // Check known variables and dynamic item variables
        const itemVars = loopVar ? getItemVariables(loopVar) : [];
        const entry = [...TEMPLATE_VARIABLES, ...itemVars].find(v => v.label === varName);
        if (entry) {
          return {
            range: {
              startLineNumber: position.lineNumber, startColumn: start + 1,
              endLineNumber: position.lineNumber, endColumn: end + 1,
            },
            contents: [
              { value: `**\`{{ ${entry.label} }}\`**` },
              { value: entry.detail },
            ],
          };
        }
      }
      return null;
    },
  });

  // ── 4. Hover info for Tailwind CSS classes ────────────────────────

  monaco.languages.registerHoverProvider('html', {
    provideHover(model: editor.ITextModel, position: Position) {
      const line = model.getLineContent(position.lineNumber);

      // Check if cursor is inside a class="…" attribute
      const beforeCursor = line.slice(0, position.column - 1);
      const classAttrMatch = beforeCursor.match(/class\s*=\s*["'][^"']*$/);
      if (!classAttrMatch) return null;

      // Find the individual class token under the cursor
      // Walk back from cursor to find start of class name
      let start = position.column - 2; // 0-indexed
      while (start >= 0 && /[\w\-:/]/.test(line[start])) start--;
      start++;
      // Walk forward to find end
      let end = position.column - 1;
      while (end < line.length && /[\w\-:/]/.test(line[end])) end++;

      const className = line.slice(start, end);
      if (!className) return null;

      const css = resolveTailwindCSS(className);
      if (!css) return null;

      return {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: start + 1,
          endLineNumber: position.lineNumber,
          endColumn: end + 1,
        },
        contents: [
          { value: `**\`.${className}\`**` },
          { value: '```css\n' + css + '\n```' },
        ],
      };
    },
  });
}

// ── 4. Template validation (errors & warnings) ─────────────────────

const KNOWN_LABELS = new Set([
  ...TEMPLATE_VARIABLES.map(v => v.label),
]);

/** Check if a variable name is a valid loop variable reference (e.g. value.name, val.fc.amount, index). */
function isLoopVariable(varName: string, fullText: string): boolean {
  const allNames = detectLoopVarNames(fullText);
  // Bare variable (e.g. index, key)
  if (allNames.has(varName)) return true;
  // Dotted path (e.g. value.name, value.fc.amount)
  const loopVar = detectLoopVar(fullText);
  if (!loopVar || !varName.startsWith(loopVar + '.')) return false;
  const suffix = varName.slice(loopVar.length + 1);
  return ITEM_SUFFIXES.some(s => s.suffix === suffix);
}

const KNOWN_DIRECTIVES = new Set(['v-if', 'v-else-if', 'v-else', 'v-for']);

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Count the HTML nesting depth change for a single line. */
function htmlDepthDelta(line: string): number {
  let delta = 0;
  const tagRegex = /<\/?([a-zA-Z][\w-]*)\b[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(line)) !== null) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    if (full.endsWith('/>') || VOID_ELEMENTS.has(tag)) continue;
    if (full.startsWith('</')) { delta--; } else { delta++; }
  }
  return delta;
}

export interface TemplateDiagnostics {
  errors: number;
  warnings: number;
  markers: editor.IMarkerData[];
}

/**
 * Validate the template and set model markers for errors/warnings.
 * Call this on every content change (debounced is fine).
 */
export function validateTemplate(
  monaco: Monaco,
  model: editor.ITextModel,
): TemplateDiagnostics {
  const text = model.getValue();
  const lines = text.split('\n');
  const markers: editor.IMarkerData[] = [];
  const MarkerSeverity = monaco.MarkerSeverity;
  let htmlDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // ── Broken brace detection ──────────────────────────────────────

    // {{ ... } — missing one closing brace
    const brokenCloseRegex = /\{\{[^}]*\}(?!\})/g;
    let brokenMatch: RegExpExecArray | null;
    while ((brokenMatch = brokenCloseRegex.exec(line)) !== null) {
      markers.push({
        severity: MarkerSeverity.Error,
        message: 'Missing closing brace — expected "}}" but found "}"',
        startLineNumber: lineNumber,
        startColumn: brokenMatch.index + 1,
        endLineNumber: lineNumber,
        endColumn: brokenMatch.index + 1 + brokenMatch[0].length,
      });
    }

    // { ... }} — missing one opening brace
    const brokenOpenRegex = /(?<!\{)\{(?!\{)[^{}]*\}\}/g;
    while ((brokenMatch = brokenOpenRegex.exec(line)) !== null) {
      markers.push({
        severity: MarkerSeverity.Error,
        message: 'Missing opening brace — expected "{{" but found "{"',
        startLineNumber: lineNumber,
        startColumn: brokenMatch.index + 1,
        endLineNumber: lineNumber,
        endColumn: brokenMatch.index + 1 + brokenMatch[0].length,
      });
    }

    // ── Valid {{ … }} expression checks ─────────────────────────────

    const regex = /\{\{(.*?)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const inner = match[1].trim();
      const col = match.index + 1;
      const endCol = col + match[0].length;

      // Error: empty expression {{ }}
      if (!inner) {
        markers.push({
          severity: MarkerSeverity.Error,
          message: 'Empty Mustache expression',
          startLineNumber: lineNumber,
          startColumn: col,
          endLineNumber: lineNumber,
          endColumn: endCol,
        });
        continue;
      }

      // Error: invalid / strange characters in expression
      // Allow + - digits for loop variable arithmetic (e.g. index + 1)
      const textBefore = lines.slice(0, i + 1).join('\n');
      const loopNames = detectLoopVarNames(textBefore);
      const isArithmeticExpr = loopNames.size > 0 &&
        /^\w+\s*[+-]\s*\d+$/.test(inner) &&
        loopNames.has(inner.match(/^(\w+)/)?.[1] || '');
      if (!isArithmeticExpr) {
        const invalidChars = inner.match(/[^\w.\s]/g);
        if (invalidChars) {
          const chars = [...new Set(invalidChars)].join(' ');
          markers.push({
            severity: MarkerSeverity.Error,
            message: `Invalid character(s) in expression: ${chars}`,
            startLineNumber: lineNumber,
            startColumn: col,
            endLineNumber: lineNumber,
            endColumn: endCol,
          });
          continue;
        }
      }

      // Variable expression — check if known
      const varName = inner.trim();
      // Skip arithmetic expressions (already validated above)
      if (isArithmeticExpr) continue;
      if (varName && /^[\w.]+$/.test(varName) && !KNOWN_LABELS.has(varName)) {
        const textBefore = lines.slice(0, i + 1).join('\n');
        if (!isLoopVariable(varName, textBefore)) {
          markers.push({
            severity: MarkerSeverity.Warning,
            message: `Unknown template variable: ${varName}`,
            startLineNumber: lineNumber,
            startColumn: col,
            endLineNumber: lineNumber,
            endColumn: endCol,
          });
        }
      }
    }

    // ── v-directive validation ───────────────────────────────────────

    const directiveRegex = /\b(v-(?:if|else-if|else|for))\s*(?:=\s*"([^"]*)")?/g;
    let dirMatch: RegExpExecArray | null;
    while ((dirMatch = directiveRegex.exec(line)) !== null) {
      const directive = dirMatch[1];
      const value = dirMatch[2];
      const dCol = dirMatch.index + 1;
      const dEndCol = dCol + dirMatch[0].length;

      if (directive === 'v-for' && value) {
        if (!/^\s*(?:\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)|\(\s*\w+\s*,\s*\w+\s*\)|\w+)\s+in\s+\w+\s*$/.test(value)) {
          markers.push({
            severity: MarkerSeverity.Error,
            message: 'Invalid v-for expression — expected "item in items", "(item, index) in items", or "(item, key, index) in items"',
            startLineNumber: lineNumber,
            startColumn: dCol,
            endLineNumber: lineNumber,
            endColumn: dEndCol,
          });
        }
      }

      // Validate v-if / v-else-if expressions
      if ((directive === 'v-if' || directive === 'v-else-if') && value) {
        const validCondition = /^\s*!?[\w.]+\s*$/.test(value) ||
          /^\s*[\w.]+\s*(?:===|!==|==|!=)\s*(?:'[^']*'|"[^"]*")\s*$/.test(value);
        if (!validCondition) {
          markers.push({
            severity: MarkerSeverity.Warning,
            message: 'Unsupported condition — use "path", "!path", or "path === \'value\'"',
            startLineNumber: lineNumber,
            startColumn: dCol,
            endLineNumber: lineNumber,
            endColumn: dEndCol,
          });
        }
      }
    }

    // Update HTML depth after processing this line
    htmlDepth += htmlDepthDelta(line);
  }

  monaco.editor.setModelMarkers(model, 'template-validator', markers);

  return {
    errors: markers.filter(m => m.severity === MarkerSeverity.Error).length,
    warnings: markers.filter(m => m.severity === MarkerSeverity.Warning).length,
    markers,
  };
}
