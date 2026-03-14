# Template Editor Guide

## Overview

The template editor lets you design invoice layouts using **HTML**, **Tailwind CSS** classes, and **Mustache-like** template tags. Changes are previewed live on the right.

---

## Template Structure

Every template has three semantic sections:

- `<header>` — Repeats at the top of every PDF page
- `<main>` — Flowing content (company info, items table, totals)
- `<footer>` — Repeats at the bottom of every PDF page

---

## Mustache Tags

Use double curly braces to insert dynamic data:

### Company

| Tag | Description |
|-----|-------------|
| `{{ company.name }}` | Company name |
| `{{ company.street }}` | Street address |
| `{{ company.city }}` | City |
| `{{ company.zip_code }}` | Zip code |
| `{{ company.country }}` | Country |
| `{{ company.email }}` | Email |
| `{{ company.phone }}` | Phone |
| `{{ company.logo_url }}` | Logo URL |
| `{{ company.vat_number }}` | VAT number |
| `{{ company.coc_number }}` | CoC number |

### Customer

| Tag | Description |
|-----|-------------|
| `{{ customer.name }}` | Customer name |
| `{{ customer.street }}` | Street address |
| `{{ customer.city }}` | City |
| `{{ customer.zip_code }}` | Zip code |
| `{{ customer.country }}` | Country |

### Invoice

| Tag | Description |
|-----|-------------|
| `{{ invoice.invoice_code }}` | Invoice code |
| `{{ invoice.status }}` | Status |
| `{{ invoice.notes }}` | Notes |
| `{{ invoice.terms }}` | Terms |

### Formatted Dates

| Tag | Description |
|-----|-------------|
| `{{ date.issue_date }}` | Formatted issue date |
| `{{ date.due_date }}` | Formatted due date |

### Currency-Formatted Amounts

| Tag | Description |
|-----|-------------|
| `{{ fc.subtotal_amount }}` | Subtotal |
| `{{ fc.discount_total_amount }}` | Discount total |
| `{{ fc.tax_total_amount }}` | Tax total |
| `{{ fc.shipping_total_amount }}` | Shipping total |
| `{{ fc.total_amount }}` | Grand total |

### Translated Labels

| Tag | Description |
|-----|-------------|
| `{{ lang.invoiceTitle }}` | "Invoice" |
| `{{ lang.billTo }}` | "Bill To" |
| `{{ lang.issueDate }}` | "Issue Date" |
| `{{ lang.dueDate }}` | "Due Date" |
| `{{ lang.item }}` | "Item" |
| `{{ lang.quantity }}` | "Quantity" |
| `{{ lang.rate }}` | "Rate" |
| `{{ lang.amount }}` | "Amount" |
| `{{ lang.subtotal }}` | "Subtotal" |
| `{{ lang.discount_label }}` | "Discount" |
| `{{ lang.tax_label }}` | "Tax" |
| `{{ lang.shipping_label }}` | "Shipping" |
| `{{ lang.total }}` | "Total" |
| `{{ lang.notes }}` | "Notes" |
| `{{ lang.terms }}` | "Terms" |
| `{{ lang.vatNumber }}` | "VAT Number" |
| `{{ lang.cocNumber }}` | "CoC Number" |

---

## Conditionals

Show or hide sections based on data:

```html
{{#if company.logo_url}}
  <img src="{{ company.logo_url }}" />
{{else}}
  <span>No logo</span>
{{/if}}
```

---

## Loops

Iterate over invoice items:

```html
{{#each items in item}}
  <div>{{ item.name }} — {{ item.fc.amount }}</div>
{{/each}}
```

### Available inside the loop

| Tag | Description |
|-----|-------------|
| `{{ item.name }}` | Item name |
| `{{ item.quantity }}` | Quantity |
| `{{ item.unit_price }}` | Unit price (raw) |
| `{{ item.fc.unit_price }}` | Unit price (formatted) |
| `{{ item.fc.amount }}` | Line total (formatted) |

---

## Styling

Use **Tailwind CSS v4** classes directly on HTML elements. The editor provides autocomplete for both Tailwind classes and template variables.

Arbitrary values are supported:

```html
<div class="px-[16mm] py-[10mm]">...</div>
```

---

## Margins

Select a margin preset from the **Margins** dropdown in the editor header bar. Margins control:

- Padding around the content area
- Spacing around header/footer in the PDF output

System margin presets: Normal, Narrow, Average, Wide.

---

## Page Numbers

Add automatic page numbers to your header or footer using template tags:

| Tag | Renders as |
|-----|------------|
| `{{ page.number }}` | Current page number (1, 2, 3…) |
| `{{ page.total }}` | Total number of pages |

### Example

```html
<footer class="absolute bottom-0 left-0 w-full py-4 text-xs text-center">
  Page {{ page.number }} of {{ page.total }}
</footer>
```

These work in both the preview and the exported PDF.

---

## Tips

- The **Problems** panel in the status bar shows validation errors for unclosed tags, unknown variables, etc.
- Use `position: absolute` on header/footer — the PDF generator converts it to `fixed` for multi-page repeating.
- System templates cannot be overwritten, but you can **Save As New** to create your own copy.
- Type `{{` to trigger variable autocomplete.
- The preview updates automatically as you type.
