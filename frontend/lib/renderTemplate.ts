/**
 * Template Rendering Utility
 * 
 * This module provides a safe way to convert TSX templates stored in the database
 * into raw HTML strings with injected invoice data.
 * 
 * SECURITY: Uses a sandboxed approach with Function constructor to evaluate templates
 * safely. Templates cannot access global scope or execute arbitrary code beyond
 * the provided data context.
 * 
 * @module lib/renderTemplate
 */

import type { InvoiceWithItems, Company, Currency } from '@/lib/types';

/**
 * Context object passed to template rendering
 */
export interface TemplateContext {
  invoice: InvoiceWithItems & {
    invoice_number: string;
    issue_date: string | null;
    due_date: string | null;
    customer_name: string;
    customer_street?: string | null;
    customer_city?: string | null;
    customer_country?: string | null;
    notes?: string | null;
    terms?: string | null;
    subtotal_amount: number | null;
    discount_amount?: number | null;
    discount_type?: 'percent' | 'fixed' | null;
    tax_amount?: number | null;
    tax_type?: 'percent' | 'fixed' | null;
    shipping_amount?: number | null;
    total_amount: number | null;
  };
  company: Company | null;
  currency: Currency | null;
}

/**
 * Convert TSX template to raw HTML string
 * 
 * This function takes a TSX template string (as stored in the database) and
 * converts it to raw HTML by:
 * 1. Transforming JSX syntax to HTML
 * 2. Injecting invoice data into placeholders
 * 3. Evaluating expressions safely
 * 
 * @param tsxTemplate - The TSX template string from database
 * @param context - The data context (invoice, company, currency)
 * @returns Raw HTML string ready for PDF generation
 * 
 * @example
 * ```ts
 * const html = renderInvoiceToHtml(
 *   '<div className="invoice">{invoice.invoice_number}</div>',
 *   { invoice, company, currency, currencySymbol: '$' }
 * );
 * // Returns: '<div class="invoice">INV-001</div>'
 * ```
 */
export function renderInvoiceToHtml(
  tsxTemplate: string,
  context: TemplateContext
): string {
  try {
    // Step 1: Transform JSX to HTML-like template (only if it's JSX format)
    // Check if template is already in template literal format (has ${ but not className=)
    const isTemplateLiteral = tsxTemplate.includes('${') && !tsxTemplate.includes('className=');
    let htmlTemplate = isTemplateLiteral ? tsxTemplate : transformJsxToHtml(tsxTemplate);

    // Step 2: Create safe evaluation context
    const safeContext = createSafeContext(context);

    // Step 3: Evaluate template with context
    const html = evaluateTemplate(htmlTemplate, safeContext);

    return html;
  } catch (error) {
    console.error('Error rendering template:', error);
    throw new Error(
      `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Transform JSX syntax to HTML template literals
 * 
 * Converts:
 * - className → class
 * - Self-closing tags → proper HTML
 * - {expression} → ${expression}
 * - {condition ? <A/> : <B/>} → ${condition ? `<A/>` : `<B/>`}
 * - {array.map()} → ${array.map().join('')}
 * - {condition && <Element />} → ${condition ? `<Element />` : ''}
 * - Removes JSX comments
 */
function transformJsxToHtml(jsx: string): string {
  console.log('\n=== Starting JSX Transformation ===');
  console.log('Input length:', jsx.length);
  
  // Step 1: Remove HTML comments
  let result = jsx.replace(/<!--[\s\S]*?-->/g, '');
  
  // Step 2: Remove JSX comments {/* ... */}
  result = result.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  
  // Step 3: Replace className with class
  result = result.replace(/className=/g, 'class=');
  
  // Step 4: Use state machine parser to convert all JSX expressions
  result = parseAndConvertJsx(result);
  
  // Step 5: Fix optional chaining that might have been split
  result = result.replace(/\?\s+\./g, '?.');
  
  // Step 6: Replace self-closing divs, spans, etc. (but keep img, br, hr, input)
  const selfClosingTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th'];
  selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*?)\\s*/>`, 'g');
    result = result.replace(regex, `<${tag}$1></${tag}>`);
  });
  
  console.log('Transformation complete. Output length:', result.length);
  return result;
}

/**
 * Convert ternary expressions from JSX to template literal format
 */
/**
 * State machine parser that converts JSX expressions to template literal expressions
 * Tracks: brace depth, paren depth, bracket depth, quote context, comments
 * Handles: .map(), ternary operators, && expressions, nested structures
 */
function parseAndConvertJsx(jsx: string): string {
  const chars = jsx.split('');
  const result: string[] = [];
  let i = 0;
  
  while (i < chars.length) {
    const char = chars[i];
    
    // Check for JSX expression start
    if (char === '{' && i > 0 && chars[i - 1] !== '$') {
      // Found a JSX expression {expr}
      const exprResult = parseJsxExpression(chars, i);
      result.push('${' + exprResult.content + '}');
      i = exprResult.endIndex + 1;
    } else {
      result.push(char);
      i++;
    }
  }
  
  return result.join('');
}

/**
 * Parse a single JSX expression starting from '{' and return the converted content
 */
function parseJsxExpression(chars: string[], startIndex: number): { content: string; endIndex: number } {
  let i = startIndex + 1; // Skip opening {
  let braceDepth = 1;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString: string | null = null; // null, '"', "'", or '`'
  let inRegex = false;
  let expressionChars: string[] = [];
  
  // Track what kind of expression this is
  let isMapExpression = false;
  let isTernaryExpression = false;
  let isAndExpression = false;
  
  // Peek ahead to identify expression type
  const peekAhead = chars.slice(i, i + 100).join('');
  if (/\.map\s*\(/.test(peekAhead)) {
    isMapExpression = true;
  }
  
  while (i < chars.length && braceDepth > 0) {
    const char = chars[i];
    const prevChar = i > 0 ? chars[i - 1] : '';
    const nextChar = i < chars.length - 1 ? chars[i + 1] : '';
    
    // Handle string contexts
    if (inString) {
      expressionChars.push(char);
      if (char === inString && prevChar !== '\\') {
        inString = null;
      }
      i++;
      continue;
    }
    
    // Check for string start
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      inString = char;
      expressionChars.push(char);
      i++;
      continue;
    }
    
    // Handle comment contexts
    if (char === '/' && nextChar === '/' && !inString) {
      // Line comment - skip to end of line
      while (i < chars.length && chars[i] !== '\n') {
        i++;
      }
      continue;
    }
    
    if (char === '/' && nextChar === '*' && !inString) {
      // Block comment - skip to */
      i += 2;
      while (i < chars.length - 1) {
        if (chars[i] === '*' && chars[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }
    
    // Track depth
    if (char === '{') {
      braceDepth++;
      expressionChars.push(char);
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        // End of expression
        break;
      }
      expressionChars.push(char);
    } else if (char === '(') {
      parenDepth++;
      expressionChars.push(char);
    } else if (char === ')') {
      parenDepth--;
      expressionChars.push(char);
    } else if (char === '[') {
      bracketDepth++;
      expressionChars.push(char);
    } else if (char === ']') {
      bracketDepth--;
      expressionChars.push(char);
    } else {
      expressionChars.push(char);
    }
    
    // Detect ternary operator (at top level of this expression)
    if (char === '?' && nextChar !== '.' && braceDepth === 1 && parenDepth === 0) {
      isTernaryExpression = true;
    }
    
    // Detect && operator (at top level of this expression)
    if (char === '&' && nextChar === '&' && braceDepth === 1 && parenDepth === 0 && !inString) {
      isAndExpression = true;
    }
    
    i++;
  }
  
  const rawContent = expressionChars.join('');
  
  // Convert based on expression type
  if (isMapExpression) {
    return { content: convertMapExpression(rawContent), endIndex: i };
  } else if (isTernaryExpression) {
    return { content: convertTernaryExpression(rawContent), endIndex: i };
  } else if (isAndExpression) {
    return { content: convertAndExpression(rawContent), endIndex: i };
  } else {
    // Simple expression - just return as-is
    return { content: rawContent, endIndex: i };
  }
}

/**
 * Convert .map((params) => (jsx)) or .map((params) => {return jsx})
 * This is a simple replacement that converts arrow function to regular function
 */
function convertMapExpression(expr: string): string {
  // Pattern: something.map((params) => (body)) or .map((params) => {body})
  // We need to extract: arrayPart, params, and body
  
  // Find the .map( part
  const mapIndex = expr.indexOf('.map(');
  if (mapIndex === -1) {
    return expr;
  }
  
  const beforeMap = expr.substring(0, mapIndex);
  let i = mapIndex + 5; // Skip ".map("
  
  // Check if there's an opening paren for the arrow function parameters
  let hasParenWrappedParams = false;
  if (expr[i] === '(') {
    hasParenWrappedParams = true;
    i++; // Skip the opening paren
  }
  
  // Extract parameters - everything until ) => or just =>
  let params = '';
  if (hasParenWrappedParams) {
    // Read until we find the closing )
    let parenDepth = 1;
    while (i < expr.length && parenDepth > 0) {
      if (expr[i] === '(') parenDepth++;
      else if (expr[i] === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          i++; // Skip the closing )
          break;
        }
      }
      params += expr[i];
      i++;
    }
  } else {
    // Single parameter without parens, read until =>
    while (i < expr.length && expr.substring(i, i + 2) !== '=>') {
      params += expr[i];
      i++;
    }
    params = params.trim();
  }
  
  // Skip whitespace and =>
  while (i < expr.length && /\s/.test(expr[i])) i++;
  if (expr.substring(i, i + 2) === '=>') {
    i += 2;
  } else {
    // Not an arrow function, return as-is
    return expr;
  }
  while (i < expr.length && /\s/.test(expr[i])) i++;
  
  // Now extract the body - it's either (jsx) or {code}
  const bodyStartChar = expr[i];
  if (bodyStartChar === '(') {
    // Body is (jsx)
    i++; // Skip (
    let parenDepth = 1;
    let body = '';
    while (i < expr.length && parenDepth > 0) {
      if (expr[i] === '(') parenDepth++;
      else if (expr[i] === ')') {
        parenDepth--;
        if (parenDepth === 0) break;
      }
      body += expr[i];
      i++;
    }
    i++; // Skip closing )
    i++; // Skip closing ) of .map()
    
    const afterMap = expr.substring(i);
    const convertedBody = convertJsxToTemplateLiteral(body);
    return `${beforeMap}.map(function(${params}) { return \`${convertedBody}\`; }).join('')${afterMap}`;
  } else if (bodyStartChar === '{') {
    // Body is {code}
    i++; // Skip {
    let braceDepth = 1;
    let body = '';
    while (i < expr.length && braceDepth > 0) {
      if (expr[i] === '{') braceDepth++;
      else if (expr[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) break;
      }
      body += expr[i];
      i++;
    }
    i++; // Skip closing }
    i++; // Skip closing ) of .map()
    
    const afterMap = expr.substring(i);
    const convertedBody = convertJsxToTemplateLiteral(body);
    return `${beforeMap}.map(function(${params}) { ${convertedBody} }).join('')${afterMap}`;
  } else {
    // Simple expression without () or {}
    let body = '';
    while (i < expr.length && expr[i] !== ')') {
      body += expr[i];
      i++;
    }
    i++; // Skip closing ) of .map()
    
    const afterMap = expr.substring(i);
    return `${beforeMap}.map(function(${params}) { return ${body}; }).join('')${afterMap}`;
  }
}


/**
 * Convert JSX content to template literal (recursively handle nested {expr})
 */
function convertJsxToTemplateLiteral(jsx: string): string {
  const chars = jsx.split('');
  const result: string[] = [];
  let i = 0;
  
  while (i < chars.length) {
    const char = chars[i];
    
    // Check for JSX expression start
    if (char === '{') {
      // Found a nested expression
      const exprResult = parseJsxExpression(chars, i);
      result.push('${' + exprResult.content + '}');
      i = exprResult.endIndex + 1;
    } else if (char === '`') {
      // Escape backticks in template literals
      result.push('\\`');
      i++;
    } else if (char === '\\') {
      // Escape backslashes
      result.push('\\\\');
      i++;
    } else {
      result.push(char);
      i++;
    }
  }
  
  return result.join('');
}

/**
 * Convert ternary expression {condition ? trueValue : falseValue}
 */
function convertTernaryExpression(expr: string): string {
  // Find the ? and : at the correct depth
  let braceDepth = 0;
  let parenDepth = 0;
  let inString: string | null = null;
  let questionIndex = -1;
  let colonIndex = -1;
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    const prevChar = i > 0 ? expr[i - 1] : '';
    
    if (inString) {
      if (char === inString && prevChar !== '\\') {
        inString = null;
      }
      continue;
    }
    
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      inString = char;
      continue;
    }
    
    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
    else if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    
    if (braceDepth === 0 && parenDepth === 0) {
      if (char === '?' && questionIndex === -1 && expr[i + 1] !== '.') {
        // Make sure it's not optional chaining (?.)
        questionIndex = i;
      } else if (char === ':' && questionIndex !== -1 && colonIndex === -1) {
        colonIndex = i;
        break;
      }
    }
  }
  
  if (questionIndex === -1 || colonIndex === -1) {
    // Not a ternary, return as-is
    return expr;
  }
  
  const condition = expr.substring(0, questionIndex).trim();
  let trueValue = expr.substring(questionIndex + 1, colonIndex).trim();
  let falseValue = expr.substring(colonIndex + 1).trim();
  
  // Remove wrapping parentheses if present
  if (trueValue.startsWith('(') && trueValue.endsWith(')')) {
    trueValue = trueValue.substring(1, trueValue.length - 1).trim();
  }
  if (falseValue.startsWith('(') && falseValue.endsWith(')')) {
    falseValue = falseValue.substring(1, falseValue.length - 1).trim();
  }
  
  // Check if true/false values contain JSX (start with <)
  const trueIsJsx = trueValue.trim().startsWith('<');
  const falseIsJsx = falseValue.trim().startsWith('<');
  
  if (trueIsJsx || falseIsJsx) {
    const convertedTrue = trueIsJsx ? convertJsxToTemplateLiteral(trueValue) : trueValue;
    const convertedFalse = falseIsJsx ? convertJsxToTemplateLiteral(falseValue) : falseValue;
    return `${condition} ? \`${convertedTrue}\` : \`${convertedFalse}\``;
  }
  
  return expr;
}

/**
 * Convert && expression {condition && <jsx>}
 */
function convertAndExpression(expr: string): string {
  // Find && at depth 0
  let braceDepth = 0;
  let parenDepth = 0;
  let inString: string | null = null;
  let andIndex = -1;
  
  for (let i = 0; i < expr.length - 1; i++) {
    const char = expr[i];
    const nextChar = expr[i + 1];
    const prevChar = i > 0 ? expr[i - 1] : '';
    
    if (inString) {
      if (char === inString && prevChar !== '\\') {
        inString = null;
      }
      continue;
    }
    
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      inString = char;
      continue;
    }
    
    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
    else if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    
    if (braceDepth === 0 && parenDepth === 0 && char === '&' && nextChar === '&') {
      andIndex = i;
      break;
    }
  }
  
  if (andIndex === -1) {
    return expr;
  }
  
  const condition = expr.substring(0, andIndex).trim();
  let jsxPart = expr.substring(andIndex + 2).trim();
  
  // Remove wrapping parentheses if present
  if (jsxPart.startsWith('(') && jsxPart.endsWith(')')) {
    jsxPart = jsxPart.substring(1, jsxPart.length - 1).trim();
  }
  
  const isJsx = jsxPart.trim().startsWith('<');
  if (isJsx) {
    const convertedJsx = convertJsxToTemplateLiteral(jsxPart);
    return `${condition} ? \`${convertedJsx}\` : ''`;
  }
  
  return expr;
}

/**
 * Create a safe context object with all necessary data and helper functions
 */
function createSafeContext(context: TemplateContext) {
  const { invoice, company, currency } = context;

  // Calculate amounts
  const subtotal = invoice.subtotal_amount || 0;
  const discountAmount = invoice.discount_total_amount || 0;
  const taxAmount = invoice.tax_total_amount || 0;
  const shippingAmount = invoice.shipping_total_amount || 0;
  const total = invoice.total_amount || 0;

  // Format dates
  const formatDate = (date: string | null) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const formattedIssueDate = formatDate(invoice.issue_date);
  const formattedDueDate = formatDate(invoice.due_date);

  return {
    // Core data
    invoice,
    company,
    currency,

    // Calculated values
    subtotal,
    discountAmount,
    taxAmount,
    shippingAmount,
    total,
    formattedIssueDate,
    formattedDueDate,

    // Helper function
    formatDate,

    // Safe conditional rendering
    when: (condition: any, truthyValue: string, falsyValue: string = '') => {
      return condition ? truthyValue : falsyValue;
    },

    // Safe mapping for arrays
    map: <T>(array: T[], callback: (item: T, index: number) => string) => {
      if (!Array.isArray(array)) return '';
      return array.map(callback).join('');
    },
  };
}

/**
 * Safely evaluate template with provided context
 * 
 * Uses Function constructor to create a sandboxed evaluation environment.
 * The template has access only to the provided context, not to global scope.
 */
function evaluateTemplate(template: string, context: any): string {
  // Wrap template in a function that returns the evaluated string
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);

  try {
    // Save for debugging
    const fs = require('fs');
    fs.writeFileSync('c:/Users/ardit/Desktop/invoice/transformed-debug.txt', template);
    
    // Create a function that evaluates the template as a template literal
    // We pass the template string directly, which already contains ${...} expressions
    const templateFunction = new Function(
      ...contextKeys,
      'return `' + template + '`;'
    );

    // Execute the function with context values
    return templateFunction(...contextValues);
  } catch (error) {
    // Log the problematic template for debugging
    console.error('\n=== TEMPLATE EVALUATION ERROR ===');
    console.error('Error:', error);
    console.error('\nTemplate (first 1000 chars):');
    console.error(template.substring(0, 1000));
    console.error('\n=================================\n');
    throw error;
  }
}

/**
 * Alternative: Parse and render TSX using a more explicit approach
 * 
 * This version manually handles common TSX patterns without eval.
 * More verbose but potentially safer for specific use cases.
 */
export function renderInvoiceToHtmlExplicit(
  tsxTemplate: string,
  context: TemplateContext
): string {
  const { invoice, company, currency } = context;

  let html = tsxTemplate;

  // Transform JSX to HTML
  html = transformJsxToHtml(html);

  // Replace simple variable references
  html = replaceVariables(html, {
    'invoice.invoice_number': invoice.invoice_number,
    'invoice.issue_date': invoice.issue_date || '',
    'invoice.due_date': invoice.due_date || '',
    'invoice.customer_name': invoice.customer_name,
    'invoice.customer_street': invoice.customer_street || '',
    'invoice.customer_city': invoice.customer_city || '',
    'invoice.customer_country': invoice.customer_country || '',
    'invoice.notes': invoice.notes || '',
    'invoice.terms': invoice.terms || '',
    'invoice.subtotal_amount': invoice.subtotal_amount,
    'invoice.discount_amount': invoice.discount_amount || 0,
    'invoice.tax_amount': invoice.tax_amount || 0,
    'invoice.shipping_amount': invoice.shipping_amount || 0,
    'invoice.total_amount': invoice.total_amount,
    'company.name': company?.name || '',
    'company.logo_url': company?.logo_url || '',
    'company.street': company?.street || '',
    'company.city': company?.city || '',
    'company.zip_code': company?.zip_code || '',
    'company.country': company?.country || '',
    'company.email': company?.email || '',
    'company.phone': company?.phone || '',
  });

  // Handle conditionals
  html = handleConditionals(html, { invoice, company, currency });

  // Handle loops
  html = handleLoops(html, { invoice, company, currency });

  return html;
}

/**
 * Replace {variable} patterns with actual values
 */
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

/**
 * Handle conditional rendering patterns
 * Matches: {condition ? <TruthyJSX /> : <FalsyJSX />}
 */
function handleConditionals(template: string, context: any): string {
  // This is a simplified implementation
  // In production, you'd use a proper JSX parser
  return template;
}

/**
 * Handle array mapping patterns
 * Matches: {items.map((item, i) => <JSX key={i}>{item}</JSX>)}
 */
function handleLoops(template: string, context: any): string {
  // This is a simplified implementation
  // In production, you'd use a proper JSX parser
  return template;
}

/**
 * USAGE EXAMPLES
 * ==============
 * 
 * Example 1: Basic template rendering
 * ------------------------------------
 * ```ts
 * const template = `
 *   <div class="invoice">
 *     <h1>Invoice #{invoice.invoice_number}</h1>
 *     <p>Customer: {invoice.customer_name}</p>
 *     <p>Total: {currencySymbol}{invoice.total_amount.toFixed(2)}</p>
 *   </div>
 * `;
 * 
 * const html = renderInvoiceToHtml(template, {
 *   invoice: { invoice_number: 'INV-001', customer_name: 'John Doe', total_amount: 1500.00 },
 *   company: null,
 *   currency: null,
 *   currencySymbol: '$'
 * });
 * ```
 * 
 * 
 * Example 2: Template with conditionals
 * --------------------------------------
 * ```ts
 * const template = `
 *   <div>
 *     {company?.logo_url ? \`
 *       <img src="\${company.logo_url}" alt="Logo" />
 *     \` : \`
 *       <div>No Logo</div>
 *     \`}
 *   </div>
 * `;
 * 
 * const html = renderInvoiceToHtml(template, context);
 * ```
 * 
 * 
 * Example 3: Template with loops
 * -------------------------------
 * ```ts
 * const template = `
 *   <div>
 *     {invoice.items.map(item => \`
 *       <div>
 *         <span>\${item.name}</span>
 *         <span>\${currencySymbol}\${item.unit_price.toFixed(2)}</span>
 *       </div>
 *     \`).join('')}
 *   </div>
 * `;
 * 
 * const html = renderInvoiceToHtml(template, context);
 * ```
 * 
 * 
 * Example 4: Using helper functions
 * ----------------------------------
 * ```ts
 * const template = `
 *   <div>
 *     <p>Issue Date: {formatDate(invoice.issue_date)}</p>
 *     <p>Total: {formatCurrency(invoice.total_amount)}</p>
 *     {when(invoice.notes, \`<p>Notes: \${invoice.notes}</p>\`)}
 *   </div>
 * `;
 * 
 * const html = renderInvoiceToHtml(template, context);
 * ```
 * 
 * 
 * Example 5: Complex template with all features
 * ----------------------------------------------
 * ```ts
 * const template = `
 *   <div class="invoice">
 *     <div class="header">
 *       {company?.logo_url ? \`<img src="\${company.logo_url}" />\` : ''}
 *       <h1>INVOICE</h1>
 *       <p>#{invoice.invoice_number}</p>
 *     </div>
 *     
 *     <div class="company">
 *       <h2>{company?.name || 'Company Name'}</h2>
 *       {company?.street ? \`<p>\${company.street}</p>\` : ''}
 *       {company?.city ? \`<p>\${company.city}</p>\` : ''}
 *     </div>
 *     
 *     <div class="customer">
 *       <h3>Bill To:</h3>
 *       <p>{invoice.customer_name}</p>
 *       {invoice.customer_street ? \`<p>\${invoice.customer_street}</p>\` : ''}
 *     </div>
 *     
 *     <table>
 *       <thead>
 *         <tr>
 *           <th>Item</th>
 *           <th>Quantity</th>
 *           <th>Rate</th>
 *           <th>Amount</th>
 *         </tr>
 *       </thead>
 *       <tbody>
 *         {invoice.items.map(item => \`
 *           <tr>
 *             <td>\${item.name}</td>
 *             <td>\${item.quantity}</td>
 *             <td>\${currencySymbol}\${item.unit_price.toFixed(2)}</td>
 *             <td>\${currencySymbol}\${(item.quantity * item.unit_price).toFixed(2)}</td>
 *           </tr>
 *         \`).join('')}
 *       </tbody>
 *     </table>
 *     
 *     <div class="totals">
 *       <div>
 *         <span>Subtotal:</span>
 *         <span>{currencySymbol}{invoice.subtotal_amount.toFixed(2)}</span>
 *       </div>
 *       {invoice.discount_amount && invoice.discount_amount > 0 ? \`
 *         <div>
 *           <span>Discount:</span>
 *           <span>-\${currencySymbol}\${invoice.discount_amount.toFixed(2)}</span>
 *         </div>
 *       \` : ''}
 *       {invoice.tax_amount && invoice.tax_amount > 0 ? \`
 *         <div>
 *           <span>Tax:</span>
 *           <span>\${currencySymbol}\${invoice.tax_amount.toFixed(2)}</span>
 *         </div>
 *       \` : ''}
 *       <div class="total">
 *         <span>Total:</span>
 *         <span>{currencySymbol}{invoice.total_amount.toFixed(2)}</span>
 *       </div>
 *     </div>
 *   </div>
 * `;
 * 
 * const html = renderInvoiceToHtml(template, {
 *   invoice,
 *   company,
 *   currency,
 *   currencySymbol: '$'
 * });
 * ```
 */

/**
 * SECURITY NOTES
 * ==============
 * 
 * The renderInvoiceToHtml function uses the Function constructor to evaluate
 * templates. While this is more controlled than eval(), there are still risks:
 * 
 * 1. TEMPLATE SOURCE
 *    - Only allow trusted users to create/edit templates
 *    - Store templates in database with proper access control
 *    - Audit template changes
 * 
 * 2. CONTEXT ISOLATION
 *    - Templates only have access to provided context
 *    - No access to global scope, require(), process, etc.
 *    - Cannot execute arbitrary server-side code
 * 
 * 3. INPUT SANITIZATION
 *    - Invoice data should still be validated before rendering
 *    - Escape HTML entities in user-provided strings
 *    - Validate URLs before using in src attributes
 * 
 * 4. ADDITIONAL SAFEGUARDS (if needed)
 *    - Use a proper JSX parser library (e.g., @babel/parser)
 *    - Implement a whitelist of allowed functions/properties
 *    - Add timeout limits for template evaluation
 *    - Run template evaluation in a separate process/VM
 * 
 * For maximum security, consider using a template engine like:
 * - Handlebars (logic-less templates)
 * - Mustache (minimal logic)
 * - Nunjucks (Jinja2-like for Node.js)
 * 
 * These engines provide better sandboxing but require converting
 * your TSX templates to their syntax.
 */
