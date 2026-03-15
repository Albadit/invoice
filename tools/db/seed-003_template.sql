-- Insert system PDF margin presets
INSERT INTO pdf_margins (name, top, "right", bottom, "left", sort, is_system)
SELECT v.name, v.top, v.r, v.bottom, v.l, v.sort, true
FROM (VALUES
  ('Normal',  '25mm', '25mm', '25mm', '25mm', 0),
  ('Narrow',  '12.7mm', '12.7mm', '12.7mm', '12.7mm', 1),
  ('Average', '25.4mm', '19.1mm', '25.4mm', '19.1mm', 2),
  ('Wide',    '25.4mm', '50.8mm', '25.4mm', '50.8mm', 3)
) AS v(name, top, r, bottom, l, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM pdf_margins pm WHERE pm.name = v.name AND pm.is_system = true
);


-- Insert system templates (is_system = true, no user_id)
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Classic', $TEMPLATE$<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<header class="absolute top-0 left-0 w-full bg-slate-900 py-2 flex items-center justify-between">
  <div class="flex items-center gap-4">
    <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-12 brightness-0 invert" />
    <span class="text-xl font-bold text-white">{{ company.name }}</span>
  </div>
  <div class="text-right">
    <h2 class="text-2xl font-bold text-white">{{ lang.invoiceTitle }}</h2>
    <p class="text-base text-slate-300 font-semibold">#{{ invoice.invoice_code }}</p>
  </div>
</header>
<main class="w-full h-full bg-transparent flex flex-col gap-8">
  <div class="flex flex-col gap-4">
    <div class="flex justify-between">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold text-gray-900">{{ company.name }}</h1>
        <p v-if="company.street" class="text-sm text-gray-600">{{ company.street }}</p>
        <p v-if="company.city" class="text-sm text-gray-600">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
        <p v-if="company.country" class="text-sm text-gray-600">{{ company.country }}</p>
        <p v-if="company.email" class="text-sm text-gray-600">{{ company.email }}</p>
        <p v-if="company.phone" class="text-sm text-gray-600">{{ company.phone }}</p>
        <p v-if="company.vat_number" class="text-sm text-gray-600"><span class="font-semibold">{{ lang.vatNumber }}:</span> {{ company.vat_number }}</p>
        <p v-if="company.coc_number" class="text-sm text-gray-600"><span class="font-semibold">{{ lang.cocNumber }}:</span> {{ company.coc_number }}</p>
      </div>
      <div class="flex flex-col gap-1">
        <div v-if="invoice.issue_date" class="flex justify-end gap-3">
          <span class="text-sm font-semibold text-gray-600">{{ lang.issueDate }}:</span>
          <span class="text-sm text-gray-900">{{ date.issue_date }}</span>
        </div>
        <div v-if="invoice.due_date" class="flex justify-end gap-3">
          <span class="text-sm font-semibold text-gray-600">{{ lang.dueDate }}:</span>
          <span class="text-sm text-gray-900">{{ date.due_date }}</span>
        </div>
      </div>
    </div>
  </div>
  <hr class="border-1 border-gray-200"/>
  <div class="flex flex-col">
    <h3 class="text-xs font-bold uppercase text-gray-600">{{ lang.billTo }}:</h3>
    <p class="text-lg font-semibold text-gray-900">{{ customer.name }}</p>
    <p v-if="customer.street" class="text-sm text-gray-600">{{ customer.street }}</p>
    <p v-if="customer.city" class="text-sm text-gray-600">{{ customer.city }}</p>
    <p v-if="customer.country" class="text-sm text-gray-600">{{ customer.country }}</p>
  </div>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-12 border-b-2 py-3 border-slate-900">
      <div class="col-span-5 text-sm font-bold text-slate-900 uppercase">{{ lang.item }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12">
      <span class="col-span-5 text-slate-700">{{ item.name }}</span>
      <span class="col-span-2 text-slate-700 text-center">{{ item.quantity }}</span>
      <span class="col-span-2 text-slate-700 text-right">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-slate-900 font-semibold text-right">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
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
    <div class="flex flex-col gap-4">
      <div class="flex justify-between text-slate-700">
        <span class="font-semibold text-gray-700">{{ lang.subtotal }}:</span>
        <span class="font-semibold text-gray-900">{{ fc.subtotal_amount }}</span>
      </div>
      <div v-if="invoice.discount_amount" class="flex justify-between text-slate-700">
        <span class="text-gray-700">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span>
        <span class="font-semibold text-gray-900">-{{ fc.discount_total_amount }}</span>
      </div>
      <div v-if="invoice.tax_amount" class="flex justify-between text-slate-700">
        <span class="text-gray-700">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span>
        <span class="font-semibold text-gray-900">{{ fc.tax_total_amount }}</span>
      </div>
      <div v-if="invoice.shipping_amount" class="flex justify-between text-slate-700">
        <span class="text-gray-700">{{ lang.shipping_label }}<span v-if="invoice.shipping_is_percent"> ({{ invoice.shipping }})</span>:</span>
        <span class="font-semibold text-gray-900">{{ fc.shipping_total_amount }}</span>
      </div>
      <div class="flex justify-between items-center pt-2 border-t">
        <span class="text-xl font-bold text-gray-900">{{ lang.total }}:</span>
        <span class="text-2xl font-bold text-gray-900">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>
<footer class="absolute bottom-0 left-0 w-full bg-slate-900 py-2 flex items-center justify-between text-xs text-slate-400">
  <span>{{ company.name }}</span>
  <span>{{ page.number }} / {{ page.total }}</span>
  <div class="flex gap-4">
    <span v-if="company.email">{{ company.email }}</span>
    <span v-if="company.phone">{{ company.phone }}</span>
  </div>
</footer>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Normal'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Classic');

-- ── Minimal ──────────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Minimal', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap">
<main class="w-full h-full flex flex-col gap-10 text-gray-800 font-[DM_Sans,sans-serif]">
  <div class="flex justify-between items-start">
    <div>
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-10 mb-4" />
      <p class="text-sm text-gray-500">{{ company.name }}</p>
      <p v-if="company.street" class="text-xs text-gray-400">{{ company.street }}</p>
      <p v-if="company.city" class="text-xs text-gray-400">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-xs text-gray-400">{{ company.country }}</p>
      <p v-if="company.email" class="text-xs text-gray-400">{{ company.email }}</p>
      <p v-if="company.phone" class="text-xs text-gray-400">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-xs text-gray-400">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-xs text-gray-400">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div class="text-right">
      <p class="text-xs uppercase tracking-widest text-gray-400">{{ lang.invoiceTitle }}</p>
      <p class="text-3xl font-light text-gray-900 mt-1">{{ invoice.invoice_code }}</p>
      <div class="mt-3 text-xs text-gray-400 space-y-1">
        <p v-if="invoice.issue_date">{{ lang.issueDate }}: {{ date.issue_date }}</p>
        <p v-if="invoice.due_date">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div>
    <p class="text-xs uppercase tracking-widest text-gray-400 mb-1">{{ lang.billTo }}</p>
    <p class="text-base font-medium text-gray-900">{{ customer.name }}</p>
    <p v-if="customer.street" class="text-xs text-gray-500">{{ customer.street }}</p>
    <p v-if="customer.city" class="text-xs text-gray-500">{{ customer.city }}</p>
    <p v-if="customer.country" class="text-xs text-gray-500">{{ customer.country }}</p>
  </div>
  <div>
    <div class="grid grid-cols-12 pb-2 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
      <div class="col-span-6">{{ lang.item }}</div>
      <div class="col-span-2 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-2 text-right">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-gray-100 text-sm">
      <span class="col-span-6">{{ item.name }}</span>
      <span class="col-span-2 text-center text-gray-500">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-gray-500">{{ item.fc.unit_price }}</span>
      <span class="col-span-2 text-right font-medium">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-12 grow content-end">
    <div class="flex flex-col gap-6 text-xs text-gray-400">
      <div v-if="invoice.notes"><p class="uppercase tracking-widest mb-1">{{ lang.notes }}</p><p class="whitespace-pre-line text-gray-500">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><p class="uppercase tracking-widest mb-1">{{ lang.terms }}</p><p class="whitespace-pre-line text-gray-500">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-gray-400">{{ lang.subtotal }}</span><span>{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span></span><span>-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span></span><span>{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.shipping_label }}</span><span>{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between pt-3 border-t border-gray-300 mt-1">
        <span class="text-lg font-medium">{{ lang.total }}</span>
        <span class="text-lg font-medium">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Minimal');

-- ── Bold Stripe ──────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Bold Stripe', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap">
<main class="w-full h-full flex flex-col font-[Montserrat,sans-serif]">
  <div class="px-8 py-6 text-white bg-[#2563eb]">
    <div class="flex justify-between items-center">
      <div>
        <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-12 mb-2 brightness-200" />
        <h1 class="text-2xl font-bold">{{ company.name }}</h1>
      </div>
      <div class="text-right">
        <h2 class="text-3xl font-black uppercase tracking-wide">{{ lang.invoiceTitle }}</h2>
        <p class="text-blue-200 text-lg font-mono">#{{ invoice.invoice_code }}</p>
      </div>
    </div>
  </div>
  <div class="px-8 py-4 grid grid-cols-3 gap-4 text-sm bg-[#eff6ff]">
    <div>
      <p v-if="company.street" class="text-gray-600">{{ company.street }}</p>
      <p v-if="company.city" class="text-gray-600">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-gray-600">{{ company.country }}</p>
      <p v-if="company.email" class="text-gray-600">{{ company.email }}</p>
      <p v-if="company.phone" class="text-gray-600">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-gray-500 text-xs">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-gray-500 text-xs">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div>
      <p class="text-xs font-bold uppercase text-gray-400 mb-1">{{ lang.billTo }}</p>
      <p class="font-semibold text-gray-900">{{ customer.name }}</p>
      <p v-if="customer.street" class="text-gray-600">{{ customer.street }}</p>
      <p v-if="customer.city" class="text-gray-600">{{ customer.city }}</p>
      <p v-if="customer.country" class="text-gray-600">{{ customer.country }}</p>
    </div>
    <div class="text-right">
      <p v-if="invoice.issue_date"><span class="text-gray-500">{{ lang.issueDate }}:</span> {{ date.issue_date }}</p>
      <p v-if="invoice.due_date"><span class="text-gray-500">{{ lang.dueDate }}:</span> {{ date.due_date }}</p>
    </div>
  </div>
  <div class="px-8 py-6 flex-1 flex flex-col">
    <div class="grid grid-cols-12 py-3 border-b-2 border-blue-600">
      <div class="col-span-5 text-xs font-bold uppercase text-blue-600">{{ lang.item }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-center text-blue-600">{{ lang.quantity }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-right text-blue-600">{{ lang.rate }}</div>
      <div class="col-span-3 text-xs font-bold uppercase text-right text-blue-600">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-gray-100">
      <span class="col-span-5 text-gray-800">{{ item.name }}</span>
      <span class="col-span-2 text-gray-500 text-center">{{ item.quantity }}</span>
      <span class="col-span-2 text-gray-500 text-right">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-gray-900 font-semibold text-right">{{ item.fc.amount }}</span>
    </div>
    <div class="grid grid-cols-2 gap-8 grow content-end mt-8">
      <div class="flex flex-col gap-4 text-sm">
        <div v-if="invoice.notes"><h4 class="font-bold text-gray-900 text-xs uppercase">{{ lang.notes }}</h4><p class="text-gray-600 whitespace-pre-line">{{ invoice.notes }}</p></div>
        <div v-if="invoice.terms"><h4 class="font-bold text-gray-900 text-xs uppercase">{{ lang.terms }}</h4><p class="text-gray-600 whitespace-pre-line">{{ invoice.terms }}</p></div>
      </div>
      <div class="flex flex-col gap-2 text-sm">
        <div class="flex justify-between"><span class="text-gray-600">{{ lang.subtotal }}:</span><span class="font-medium">{{ fc.subtotal_amount }}</span></div>
        <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-gray-600">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span>-{{ fc.discount_total_amount }}</span></div>
        <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-gray-600">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span>{{ fc.tax_total_amount }}</span></div>
        <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-gray-600">{{ lang.shipping_label }}:</span><span>{{ fc.shipping_total_amount }}</span></div>
        <div class="flex justify-between items-center pt-3 border-t-2 border-blue-600 mt-1">
          <span class="text-lg font-bold">{{ lang.total }}:</span>
          <span class="text-xl font-black text-blue-600">{{ fc.total_amount }}</span>
        </div>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Bold Stripe');

-- ── Elegant ──────────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Elegant', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap">
<main class="w-full h-full flex flex-col gap-8 text-gray-800 font-[Playfair_Display,Georgia,serif]">
  <div class="text-center pt-2">
    <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-14 mx-auto mb-3" />
    <h2 class="text-4xl font-normal tracking-wide text-gray-900 font-[Playfair_Display,Georgia,serif]">{{ lang.invoiceTitle }}</h2>
    <p class="text-gray-500 mt-1 italic">#{{ invoice.invoice_code }}</p>
  </div>
  <div class="border-t border-b border-gray-300 py-6 grid grid-cols-3 gap-6 text-sm">
    <div>
      <p class="font-bold text-gray-900">{{ company.name }}</p>
      <p v-if="company.street" class="text-gray-600">{{ company.street }}</p>
      <p v-if="company.city" class="text-gray-600">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-gray-600">{{ company.country }}</p>
      <p v-if="company.email" class="text-gray-600">{{ company.email }}</p>
      <p v-if="company.phone" class="text-gray-600">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-gray-500 text-xs">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-gray-500 text-xs">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div>
      <p class="text-xs uppercase tracking-widest text-gray-400 mb-1">{{ lang.billTo }}</p>
      <p class="font-bold text-gray-900">{{ customer.name }}</p>
      <p v-if="customer.street" class="text-gray-600">{{ customer.street }}</p>
      <p v-if="customer.city" class="text-gray-600">{{ customer.city }}</p>
      <p v-if="customer.country" class="text-gray-600">{{ customer.country }}</p>
    </div>
    <div class="text-right">
      <p v-if="invoice.issue_date"><span class="text-gray-500 italic">{{ lang.issueDate }}:</span> {{ date.issue_date }}</p>
      <p v-if="invoice.due_date"><span class="text-gray-500 italic">{{ lang.dueDate }}:</span> {{ date.due_date }}</p>
    </div>
  </div>
  <div>
    <div class="grid grid-cols-12 pb-2 border-b border-gray-400 text-xs uppercase tracking-wider text-gray-500">
      <div class="col-span-5">{{ lang.item }}</div>
      <div class="col-span-2 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-right">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-gray-100 text-sm">
      <span class="col-span-5 italic">{{ item.name }}</span>
      <span class="col-span-2 text-center text-gray-500">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-gray-500">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right font-bold">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-10 grow content-end">
    <div class="flex flex-col gap-6 text-sm">
      <div v-if="invoice.notes"><h4 class="italic text-gray-500 mb-1">{{ lang.notes }}</h4><p class="text-gray-600 whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><h4 class="italic text-gray-500 mb-1">{{ lang.terms }}</h4><p class="text-gray-600 whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-gray-500">{{ lang.subtotal }}:</span><span>{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span>-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span>{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.shipping_label }}:</span><span>{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between items-center pt-3 border-t border-gray-400 mt-2">
        <span class="text-xl font-[Playfair_Display,Georgia,serif]">{{ lang.total }}:</span>
        <span class="text-2xl font-bold">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Elegant');

-- ── Warm Earth ───────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Warm Earth', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap">
<main class="w-full h-full flex flex-col gap-8 font-[Lora,serif] text-[#3d2c2c]">
  <div class="flex justify-between items-start">
    <div>
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-14 mb-3 rounded" />
      <div v-else class="h-14 w-28 rounded flex items-center justify-center text-xs font-bold mb-3 bg-[#d4a373] text-white">Logo</div>
      <h1 class="text-2xl font-bold text-[#6b4226]">{{ company.name }}</h1>
      <p v-if="company.street" class="text-sm text-[#8b6f5c]">{{ company.street }}</p>
      <p v-if="company.city" class="text-sm text-[#8b6f5c]">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-sm text-[#8b6f5c]">{{ company.country }}</p>
      <p v-if="company.email" class="text-sm text-[#8b6f5c]">{{ company.email }}</p>
      <p v-if="company.phone" class="text-sm text-[#8b6f5c]">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-xs text-[#a08070]">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-xs text-[#a08070]">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div class="text-right">
      <h2 class="text-3xl font-bold text-[#d4a373]">{{ lang.invoiceTitle }}</h2>
      <p class="text-lg font-semibold text-[#8b6f5c]">#{{ invoice.invoice_code }}</p>
      <div class="mt-3 text-sm text-[#8b6f5c]">
        <p v-if="invoice.issue_date">{{ lang.issueDate }}: {{ date.issue_date }}</p>
        <p v-if="invoice.due_date">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div class="h-px bg-[linear-gradient(to_right,#d4a373,#faedcd,#d4a373)]"></div>
  <div>
    <h3 class="text-xs font-bold uppercase text-[#d4a373]">{{ lang.billTo }}</h3>
    <p class="text-base font-semibold text-[#6b4226]">{{ customer.name }}</p>
    <p v-if="customer.street" class="text-sm text-[#8b6f5c]">{{ customer.street }}</p>
    <p v-if="customer.city" class="text-sm text-[#8b6f5c]">{{ customer.city }}</p>
    <p v-if="customer.country" class="text-sm text-[#8b6f5c]">{{ customer.country }}</p>
  </div>
  <div>
    <div class="grid grid-cols-12 py-3 border-b-2 border-[#d4a373]">
      <div class="col-span-5 text-xs font-bold uppercase text-[#d4a373]">{{ lang.item }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-center text-[#d4a373]">{{ lang.quantity }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-right text-[#d4a373]">{{ lang.rate }}</div>
      <div class="col-span-3 text-xs font-bold uppercase text-right text-[#d4a373]">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-[#f0e0d0]">
      <span class="col-span-5 text-[#6b4226]">{{ item.name }}</span>
      <span class="col-span-2 text-center text-[#8b6f5c]">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-[#8b6f5c]">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right font-bold text-[#6b4226]">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
    <div class="flex flex-col gap-6 text-sm text-[#8b6f5c]">
      <div v-if="invoice.notes"><h4 class="font-bold text-xs uppercase text-[#d4a373]">{{ lang.notes }}</h4><p class="whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><h4 class="font-bold text-xs uppercase text-[#d4a373]">{{ lang.terms }}</h4><p class="whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-[#8b6f5c]">{{ lang.subtotal }}:</span><span class="text-[#6b4226]">{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-[#8b6f5c]">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span class="text-[#6b4226]">-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-[#8b6f5c]">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span class="text-[#6b4226]">{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-[#8b6f5c]">{{ lang.shipping_label }}:</span><span class="text-[#6b4226]">{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between items-center pt-3 border-t-2 mt-1 border-[#d4a373]">
        <span class="text-xl font-bold text-[#6b4226]">{{ lang.total }}:</span>
        <span class="text-2xl font-black text-[#d4a373]">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Warm Earth');

-- ── Corporate ────────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Corporate', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700;800;900&display=swap">
<main class="w-full h-full flex flex-col text-gray-800 font-[Source_Sans_3,sans-serif]">
  <div class="flex justify-between items-center pb-4 border-b-4 border-gray-900">
    <div class="flex items-center gap-4">
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-16" />
      <div v-else class="h-16 w-16 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold">Logo</div>
      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ company.name }}</h1>
        <p v-if="company.email" class="text-xs text-gray-500">{{ company.email }}</p>
        <p v-if="company.phone" class="text-xs text-gray-500">{{ company.phone }}</p>
      </div>
    </div>
    <div class="text-right">
      <h2 class="text-sm uppercase tracking-[0.3em] text-gray-400 font-bold">{{ lang.invoiceTitle }}</h2>
      <p class="text-2xl font-bold text-gray-900 mt-1">{{ invoice.invoice_code }}</p>
    </div>
  </div>
  <div class="grid grid-cols-3 gap-6 py-6 text-sm">
    <div>
      <p v-if="company.street" class="text-gray-600">{{ company.street }}</p>
      <p v-if="company.city" class="text-gray-600">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-gray-600">{{ company.country }}</p>
      <p v-if="company.vat_number" class="text-xs text-gray-400 mt-2">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-xs text-gray-400">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div>
      <p class="text-xs font-bold uppercase text-gray-400 mb-2">{{ lang.billTo }}</p>
      <p class="font-bold text-gray-900">{{ customer.name }}</p>
      <p v-if="customer.street" class="text-gray-600">{{ customer.street }}</p>
      <p v-if="customer.city" class="text-gray-600">{{ customer.city }}</p>
      <p v-if="customer.country" class="text-gray-600">{{ customer.country }}</p>
    </div>
    <div class="text-right">
      <p v-if="invoice.issue_date" class="text-gray-600">{{ lang.issueDate }}: {{ date.issue_date }}</p>
      <p v-if="invoice.due_date" class="text-gray-600">{{ lang.dueDate }}: {{ date.due_date }}</p>
    </div>
  </div>
  <div class="flex-1">
    <div class="grid grid-cols-12 py-3 text-xs font-bold uppercase tracking-wider text-white bg-gray-800">
      <div class="col-span-5 pl-3">{{ lang.item }}</div>
      <div class="col-span-2 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-right pr-3">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-gray-100 text-sm">
      <span class="col-span-5 pl-3">{{ item.name }}</span>
      <span class="col-span-2 text-center text-gray-500">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-gray-500">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right pr-3 font-semibold">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-8 mt-8">
    <div class="flex flex-col gap-4 text-sm">
      <div v-if="invoice.notes"><h4 class="text-xs font-bold uppercase text-gray-400">{{ lang.notes }}</h4><p class="text-gray-600 whitespace-pre-line mt-1">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><h4 class="text-xs font-bold uppercase text-gray-400">{{ lang.terms }}</h4><p class="text-gray-600 whitespace-pre-line mt-1">{{ invoice.terms }}</p></div>
    </div>
    <div>
      <div class="flex flex-col gap-2 text-sm">
        <div class="flex justify-between"><span class="text-gray-500">{{ lang.subtotal }}:</span><span>{{ fc.subtotal_amount }}</span></div>
        <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span>-{{ fc.discount_total_amount }}</span></div>
        <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span>{{ fc.tax_total_amount }}</span></div>
        <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-gray-500">{{ lang.shipping_label }}:</span><span>{{ fc.shipping_total_amount }}</span></div>
      </div>
      <div class="flex justify-between items-center py-3 mt-3 text-white px-3 rounded bg-gray-800">
        <span class="text-lg font-bold">{{ lang.total }}:</span>
        <span class="text-xl font-black">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Corporate');

-- ── Ocean Breeze ─────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Ocean Breeze', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap">
<main class="w-full h-full flex flex-col gap-6 font-[Nunito,sans-serif] text-[#1e3a5f]">
  <div class="flex justify-between items-start">
    <div>
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-14 mb-3" />
      <div v-else class="h-14 w-28 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3 bg-[linear-gradient(135deg,#0ea5e9,#2dd4bf)]">Logo</div>
      <h1 class="text-xl font-bold text-[#0c4a6e]">{{ company.name }}</h1>
      <p v-if="company.street" class="text-sm text-[#4b8bb5]">{{ company.street }}</p>
      <p v-if="company.city" class="text-sm text-[#4b8bb5]">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-sm text-[#4b8bb5]">{{ company.country }}</p>
      <p v-if="company.email" class="text-sm text-[#4b8bb5]">{{ company.email }}</p>
      <p v-if="company.phone" class="text-sm text-[#4b8bb5]">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-xs text-[#7db8d4]">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-xs text-[#7db8d4]">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div class="text-right">
      <h2 class="text-4xl font-black bg-[linear-gradient(135deg,#0ea5e9,#2dd4bf)] bg-clip-text [-webkit-text-fill-color:transparent]">{{ lang.invoiceTitle }}</h2>
      <p class="text-lg font-mono mt-1 text-[#0ea5e9]">#{{ invoice.invoice_code }}</p>
      <div class="mt-3 text-sm text-[#4b8bb5]">
        <p v-if="invoice.issue_date">{{ lang.issueDate }}: {{ date.issue_date }}</p>
        <p v-if="invoice.due_date">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div class="h-1 rounded bg-[linear-gradient(to_right,#0ea5e9,#2dd4bf)]"></div>
  <div class="p-4 rounded-lg bg-[#f0f9ff]">
    <h3 class="text-xs font-bold uppercase text-[#0ea5e9]">{{ lang.billTo }}</h3>
    <p class="font-semibold text-[#0c4a6e]">{{ customer.name }}</p>
    <p v-if="customer.street" class="text-sm text-[#4b8bb5]">{{ customer.street }}</p>
    <p v-if="customer.city" class="text-sm text-[#4b8bb5]">{{ customer.city }}</p>
    <p v-if="customer.country" class="text-sm text-[#4b8bb5]">{{ customer.country }}</p>
  </div>
  <div>
    <div class="grid grid-cols-12 py-3 rounded-t-lg text-xs font-bold uppercase text-white bg-[linear-gradient(135deg,#0ea5e9,#2dd4bf)]">
      <div class="col-span-5 pl-3">{{ lang.item }}</div>
      <div class="col-span-2 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-right pr-3">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-[#e0f2fe] text-sm">
      <span class="col-span-5 pl-3 text-[#0c4a6e]">{{ item.name }}</span>
      <span class="col-span-2 text-center text-[#4b8bb5]">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-[#4b8bb5]">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right pr-3 font-bold text-[#0c4a6e]">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
    <div class="flex flex-col gap-6 text-sm text-[#4b8bb5]">
      <div v-if="invoice.notes"><h4 class="font-bold text-xs uppercase text-[#0ea5e9]">{{ lang.notes }}</h4><p class="whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><h4 class="font-bold text-xs uppercase text-[#0ea5e9]">{{ lang.terms }}</h4><p class="whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-[#4b8bb5]">{{ lang.subtotal }}:</span><span class="text-[#0c4a6e]">{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-[#4b8bb5]">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span class="text-[#0c4a6e]">-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-[#4b8bb5]">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span class="text-[#0c4a6e]">{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-[#4b8bb5]">{{ lang.shipping_label }}:</span><span class="text-[#0c4a6e]">{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between items-center pt-3 mt-1 text-white px-3 py-2 rounded-lg bg-[linear-gradient(135deg,#0ea5e9,#2dd4bf)]">
        <span class="text-lg font-bold">{{ lang.total }}:</span>
        <span class="text-xl font-black">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Ocean Breeze');

-- ── Monochrome ───────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Monochrome', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap">
<main class="w-full h-full flex flex-col gap-8 text-black font-[Space_Grotesk,sans-serif]">
  <div class="flex justify-between items-start pb-6 border-b-2 border-black">
    <div>
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-14 mb-3 grayscale" />
      <h1 class="text-xl font-black uppercase tracking-wider">{{ company.name }}</h1>
      <div class="text-xs mt-2 space-y-0.5 text-[#555555]">
        <p v-if="company.street">{{ company.street }}</p>
        <p v-if="company.city">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
        <p v-if="company.country">{{ company.country }}</p>
        <p v-if="company.email">{{ company.email }}</p>
        <p v-if="company.phone">{{ company.phone }}</p>
        <p v-if="company.vat_number">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
        <p v-if="company.coc_number">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
      </div>
    </div>
    <div class="text-right">
      <h2 class="text-5xl font-black tracking-tighter">{{ lang.invoiceTitle }}</h2>
      <p class="text-sm font-mono mt-2 text-[#555555]">{{ invoice.invoice_code }}</p>
      <div class="text-xs mt-3 text-[#777777]">
        <p v-if="invoice.issue_date">{{ lang.issueDate }}: {{ date.issue_date }}</p>
        <p v-if="invoice.due_date">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div>
    <p class="text-xs font-black uppercase tracking-wider mb-1">{{ lang.billTo }}</p>
    <p class="text-base font-bold">{{ customer.name }}</p>
    <div class="text-xs text-[#555555]">
      <p v-if="customer.street">{{ customer.street }}</p>
      <p v-if="customer.city">{{ customer.city }}</p>
      <p v-if="customer.country">{{ customer.country }}</p>
    </div>
  </div>
  <div>
    <div class="grid grid-cols-12 py-2 border-y-2 border-black text-xs font-black uppercase tracking-wider">
      <div class="col-span-5">{{ lang.item }}</div>
      <div class="col-span-2 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-right">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-[#dddddd] text-sm">
      <span class="col-span-5">{{ item.name }}</span>
      <span class="col-span-2 text-center text-[#555555]">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-[#555555]">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right font-bold">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-10 grow content-end">
    <div class="flex flex-col gap-6 text-xs text-[#555555]">
      <div v-if="invoice.notes"><p class="font-black uppercase tracking-wider text-black mb-1">{{ lang.notes }}</p><p class="whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><p class="font-black uppercase tracking-wider text-black mb-1">{{ lang.terms }}</p><p class="whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-[#555555]">{{ lang.subtotal }}:</span><span>{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-[#555555]">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span>-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-[#555555]">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span>{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-[#555555]">{{ lang.shipping_label }}:</span><span>{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between items-center pt-3 mt-1 border-t-2 border-black">
        <span class="text-xl font-black">{{ lang.total }}:</span>
        <span class="text-2xl font-black">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Monochrome');

-- ── Royal Purple ─────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Royal Purple', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap">
<main class="w-full h-full flex flex-col gap-6 font-[Outfit,sans-serif] text-[#2d1b4e]">
  <div class="flex justify-between items-start">
    <div>
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-14 mb-3" />
      <div v-else class="h-14 w-28 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3 bg-[linear-gradient(135deg,#7c3aed,#a855f7)]">Logo</div>
      <h1 class="text-2xl font-bold text-[#4c1d95]">{{ company.name }}</h1>
      <p v-if="company.street" class="text-sm text-[#7c6f9b]">{{ company.street }}</p>
      <p v-if="company.city" class="text-sm text-[#7c6f9b]">{{ company.city }}<span v-if="company.zip_code">, {{ company.zip_code }}</span></p>
      <p v-if="company.country" class="text-sm text-[#7c6f9b]">{{ company.country }}</p>
      <p v-if="company.email" class="text-sm text-[#7c6f9b]">{{ company.email }}</p>
      <p v-if="company.phone" class="text-sm text-[#7c6f9b]">{{ company.phone }}</p>
      <p v-if="company.vat_number" class="text-xs text-[#9b8fc0]">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
      <p v-if="company.coc_number" class="text-xs text-[#9b8fc0]">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
    </div>
    <div class="text-right">
      <h2 class="text-4xl font-black text-[#7c3aed]">{{ lang.invoiceTitle }}</h2>
      <p class="text-lg font-mono mt-1 text-[#a78bfa]">#{{ invoice.invoice_code }}</p>
      <div class="mt-3 text-sm text-[#7c6f9b]">
        <p v-if="invoice.issue_date">{{ lang.issueDate }}: {{ date.issue_date }}</p>
        <p v-if="invoice.due_date">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div class="h-1 rounded-full bg-[linear-gradient(to_right,#7c3aed,#a855f7,#c084fc)]"></div>
  <div class="p-4 rounded-xl bg-[#f5f3ff]">
    <h3 class="text-xs font-bold uppercase text-[#7c3aed]">{{ lang.billTo }}</h3>
    <p class="font-semibold text-[#4c1d95]">{{ customer.name }}</p>
    <p v-if="customer.street" class="text-sm text-[#7c6f9b]">{{ customer.street }}</p>
    <p v-if="customer.city" class="text-sm text-[#7c6f9b]">{{ customer.city }}</p>
    <p v-if="customer.country" class="text-sm text-[#7c6f9b]">{{ customer.country }}</p>
  </div>
  <div>
    <div class="grid grid-cols-12 py-3 border-b-2 border-[#7c3aed]">
      <div class="col-span-5 text-xs font-bold uppercase text-[#7c3aed]">{{ lang.item }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-center text-[#7c3aed]">{{ lang.quantity }}</div>
      <div class="col-span-2 text-xs font-bold uppercase text-right text-[#7c3aed]">{{ lang.rate }}</div>
      <div class="col-span-3 text-xs font-bold uppercase text-right text-[#7c3aed]">{{ lang.amount }}</div>
    </div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 border-b border-[#ede9fe] text-sm">
      <span class="col-span-5 text-[#4c1d95]">{{ item.name }}</span>
      <span class="col-span-2 text-center text-[#7c6f9b]">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-[#7c6f9b]">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right font-bold text-[#4c1d95]">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
    <div class="flex flex-col gap-6 text-sm text-[#7c6f9b]">
      <div v-if="invoice.notes"><h4 class="font-bold text-xs uppercase text-[#7c3aed]">{{ lang.notes }}</h4><p class="whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><h4 class="font-bold text-xs uppercase text-[#7c3aed]">{{ lang.terms }}</h4><p class="whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-[#7c6f9b]">{{ lang.subtotal }}:</span><span class="text-[#4c1d95]">{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-[#7c6f9b]">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span>:</span><span class="text-[#4c1d95]">-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-[#7c6f9b]">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span>:</span><span class="text-[#4c1d95]">{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-[#7c6f9b]">{{ lang.shipping_label }}:</span><span class="text-[#4c1d95]">{{ fc.shipping_total_amount }}</span></div>
      <div class="flex justify-between items-center pt-3 mt-1 text-white px-3 py-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed,#a855f7)]">
        <span class="text-lg font-bold">{{ lang.total }}:</span>
        <span class="text-xl font-black">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Royal Purple');

-- ── Swiss Clean ──────────────────────────────────────────────────
INSERT INTO templates (name, styling, margin_id, is_system)
SELECT 'Swiss Clean', $TEMPLATE$<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap">
<main class="w-full h-full flex flex-col gap-10 text-gray-900 font-[Manrope,sans-serif]">
  <div class="flex justify-between items-start">
    <div class="flex items-start gap-3">
      <img v-if="company.logo_url" src="{{ company.logo_url }}" alt="Logo" class="h-10" />
      <div v-else class="h-10 w-10 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">+</div>
      <div>
        <h1 class="text-lg font-semibold">{{ company.name }}</h1>
        <div class="text-xs text-gray-400 mt-1">
          <span v-if="company.street">{{ company.street }}</span>
          <span v-if="company.city"> · {{ company.city }}<span v-if="company.zip_code"> {{ company.zip_code }}</span></span>
          <span v-if="company.country"> · {{ company.country }}</span>
        </div>
        <div class="text-xs text-gray-400">
          <span v-if="company.email">{{ company.email }}</span>
          <span v-if="company.phone"> · {{ company.phone }}</span>
        </div>
        <p v-if="company.vat_number" class="text-xs text-gray-300 mt-1">{{ lang.vatNumber }}: {{ company.vat_number }}</p>
        <p v-if="company.coc_number" class="text-xs text-gray-300">{{ lang.cocNumber }}: {{ company.coc_number }}</p>
      </div>
    </div>
    <div class="text-right">
      <p class="text-xs text-gray-400 uppercase tracking-[0.2em]">{{ lang.invoiceTitle }}</p>
      <p class="text-2xl font-bold mt-0.5">{{ invoice.invoice_code }}</p>
      <div class="text-xs text-gray-400 mt-2 space-y-0.5">
        <p v-if="invoice.issue_date">{{ date.issue_date }}</p>
        <p v-if="invoice.due_date" class="text-red-500 font-medium">{{ lang.dueDate }}: {{ date.due_date }}</p>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-12">
    <div>
      <p class="text-xs text-gray-400 uppercase tracking-[0.15em] mb-2">{{ lang.billTo }}</p>
      <p class="font-semibold">{{ customer.name }}</p>
      <p v-if="customer.street" class="text-sm text-gray-500">{{ customer.street }}</p>
      <p v-if="customer.city" class="text-sm text-gray-500">{{ customer.city }}</p>
      <p v-if="customer.country" class="text-sm text-gray-500">{{ customer.country }}</p>
    </div>
  </div>
  <div>
    <div class="grid grid-cols-12 py-2 text-xs text-gray-400 uppercase tracking-wider">
      <div class="col-span-6">{{ lang.item }}</div>
      <div class="col-span-1 text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-right">{{ lang.amount }}</div>
    </div>
    <div class="h-px bg-gray-900"></div>
    <div v-for="item in items" class="grid grid-cols-12 py-3 text-sm border-b border-gray-100">
      <span class="col-span-6">{{ item.name }}</span>
      <span class="col-span-1 text-center text-gray-400">{{ item.quantity }}</span>
      <span class="col-span-2 text-right text-gray-400">{{ item.fc.unit_price }}</span>
      <span class="col-span-3 text-right font-medium">{{ item.fc.amount }}</span>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-12 grow content-end">
    <div class="flex flex-col gap-6 text-xs text-gray-400">
      <div v-if="invoice.notes"><p class="uppercase tracking-wider mb-1">{{ lang.notes }}</p><p class="text-gray-500 whitespace-pre-line">{{ invoice.notes }}</p></div>
      <div v-if="invoice.terms"><p class="uppercase tracking-wider mb-1">{{ lang.terms }}</p><p class="text-gray-500 whitespace-pre-line">{{ invoice.terms }}</p></div>
    </div>
    <div class="flex flex-col gap-1.5 text-sm">
      <div class="flex justify-between"><span class="text-gray-400">{{ lang.subtotal }}</span><span>{{ fc.subtotal_amount }}</span></div>
      <div v-if="invoice.discount_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.discount_label }}<span v-if="invoice.discount_is_percent"> ({{ invoice.discount }})</span></span><span>-{{ fc.discount_total_amount }}</span></div>
      <div v-if="invoice.tax_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.tax_label }}<span v-if="invoice.tax_is_percent"> ({{ invoice.tax }})</span></span><span>{{ fc.tax_total_amount }}</span></div>
      <div v-if="invoice.shipping_amount" class="flex justify-between"><span class="text-gray-400">{{ lang.shipping_label }}</span><span>{{ fc.shipping_total_amount }}</span></div>
      <div class="h-px bg-gray-900 mt-2"></div>
      <div class="flex justify-between pt-1">
        <span class="text-base font-bold">{{ lang.total }}</span>
        <span class="text-xl font-bold">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</main>$TEMPLATE$, (SELECT id FROM pdf_margins WHERE name = 'Narrow'), true
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Swiss Clean');

-- Ensure all new templates are flagged as system
UPDATE templates SET is_system = true WHERE name IN (
  'Classic', 'Minimal', 'Bold Stripe', 'Elegant', 
  'Warm Earth', 'Corporate', 'Ocean Breeze',
  'Monochrome', 'Royal Purple', 'Swiss Clean'
) AND user_id IS NULL;