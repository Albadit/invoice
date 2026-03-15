# Template Editor Guide

## Overview

The template editor lets you design invoice layouts using **HTML**, **Tailwind CSS** classes, and **Vue-style** directives with **Mustache** interpolation. Changes are previewed live on the right.

---

## Template Structure

Every template has three semantic sections:

- `<header>` - Repeats at the top of every PDF page
- `<main>` - Flowing content (company info, items table, totals)
- `<footer>` - Repeats at the bottom of every PDF page

---

## Interpolation Tags

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
| `{{ company.bank_number }}` | Bank number |

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
| `{{ lang.bankNumber }}` | "Bank Number" |

---

## Conditionals

Show or hide elements based on data using `v-if`, `v-else-if`, and `v-else` directives:

```html
<img v-if="company.logo_url" src="{{ company.logo_url }}" />
```

Negation (show when value is falsy):

```html
<div v-if="!invoice.notes">No notes provided</div>
```

Equality comparison:

```html
<div v-if="invoice.status === 'paid'">Paid</div>
<div v-if="invoice.status == 'pending'">Pending</div>
```

Inequality comparison:

```html
<div v-if="invoice.status !== 'cancelled'">Active</div>
```

With else:

```html
<img v-if="company.logo_url" src="{{ company.logo_url }}" />
<div v-else>No logo</div>
```

With else-if:

```html
<div v-if="invoice.discount_amount">Has discount</div>
<div v-else-if="invoice.tax_amount">Has tax only</div>
<div v-else>No adjustments</div>
```

---

## Loops

Iterate over invoice items with `v-for`:

```html
<div v-for="value in items">{{ value.name }} - {{ value.fc.amount }}</div>
```

With index:

```html
<div v-for="(value, index) in items">{{ index }}. {{ value.name }}</div>
```

With index arithmetic (1-based numbering):

```html
<div v-for="(value, index) in items">{{ index + 1 }}. {{ value.name }}</div>
```

With key and index (for arrays key equals index):

```html
<div v-for="(value, key, index) in items">{{ index }}. {{ value.name }}</div>
```

### Fragment (`<template>`)

Use the `<template>` tag to group multiple elements under a single directive without adding an extra wrapper to the DOM. Works with both `v-if` and `v-for`:

```html
<template v-if="invoice.discount_amount">
  <span>Discount:</span>
  <span>-{{ fc.discount_total_amount }}</span>
</template>
```

```html
<template v-for="item in items">
  <span>{{ item.name }}</span>
  <span>{{ item.fc.amount }}</span>
</template>
```

This is useful inside CSS Grid layouts where extra wrapper elements would break the column flow.

### Available inside the loop

| Tag | Description |
|-----|-------------|
| `{{ value.name }}` | Item name |
| `{{ value.quantity }}` | Quantity |
| `{{ value.unit_price }}` | Unit price (raw) |
| `{{ value.fc.unit_price }}` | Unit price (formatted) |
| `{{ value.fc.amount }}` | Line total (formatted) |
| `{{ index }}` | Numeric index (0-based) |
| `{{ index + 1 }}` | 1-based index (supports `+` and `-`) |
| `{{ key }}` | Key (equals index for arrays) |

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

- The **Problems** panel in the status bar shows validation errors for unknown variables, invalid directives, etc.
- Use `v-if` on any HTML element to conditionally include it.
- Use `v-for="item in items"` on an element to repeat it for each invoice item.
- Use `position: absolute` on header/footer - the PDF generator converts it to `fixed` for multi-page repeating.
- System templates cannot be overwritten, but you can **Save As New** to create your own copy.
- Type `{{` to trigger variable autocomplete.
- The preview updates automatically as you type.
