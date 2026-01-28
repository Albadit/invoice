'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi, companiesApi, templatesApi } from '@/features/settings/api';
import type { InvoiceItem, Currency, Company, Template } from '@/lib/types';
import type { InvoicesPost } from '@/lib/database.types';
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import { Plus, Trash, Save } from 'lucide-react';
import { format } from 'date-fns';
import { parseDate, CalendarDate } from '@internationalized/date';
import { addToast } from "@heroui/toast";

export default function InvoiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const isNewInvoice = params.id === 'new';

  const [loading, setLoading] = useState(!isNewInvoice);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerZipCode, setCustomerZipCode] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');
  const [dateCreated, setDateCreated] = useState<CalendarDate | null>(parseDate(format(new Date(), 'yyyy-MM-dd')));
  const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currencyId, setCurrencyId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([
    { name: '', quantity: 1, unit_price: 0 },
  ]);

  // Get the selected currency symbol
  const getCurrencySymbol = () => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : '$';
  };
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [taxType, setTaxType] = useState<'percent' | 'fixed' | null>(null);
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [shippingAmount, setShippingAmount] = useState<number | null>(null);
  
  const [showDiscount, setShowDiscount] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Load all dropdown options first
        const [currenciesData, companiesData, templatesData] = await Promise.all([
          currenciesApi.getAll(),
          companiesApi.getAll(),
          templatesApi.getAll()
        ]);
        
        setCurrencies(currenciesData);
        setCompanies(companiesData);
        setTemplates(templatesData);

        if (!isNewInvoice) {
          // Load invoice data with company, currency, and items included
          const invoice = await invoicesApi.getById(params.id as string);
          
          setInvoiceNumber(invoice.invoice_number);
          setCustomerName(invoice.customer_name);
          setCustomerStreet(invoice.customer_street);
          setCustomerCity(invoice.customer_city);
          setCustomerZipCode(invoice.customer_zip_code);
          setCustomerCountry(invoice.customer_country);
          
          const issueDate = invoice.issue_date || invoice.created_at;
          if (issueDate) {
            setDateCreated(parseDate(issueDate.split('T')[0]));
          }
          if (invoice.due_date) {
            setDueDate(parseDate(invoice.due_date.split('T')[0]));
          }
          
          setNotes(invoice.notes || '');
          setTerms(invoice.terms || '');
          
          // Set IDs from invoice, but validate they exist in the loaded data
          const currencyExists = currenciesData.some(c => c.id === invoice.currency_id);
          const companyExists = companiesData.some(c => c.id === invoice.company_id);
          const templateExists = invoice.template_id ? templatesData.some(t => t.id === invoice.template_id) : true;
          
          setCurrencyId(currencyExists ? invoice.currency_id : (currenciesData[0]?.id || null));
          setCompanyId(companyExists ? invoice.company_id : (companiesData[0]?.id || ''));
          setTemplateId(templateExists ? (invoice.template_id || null) : (templatesData[0]?.id || null));

          // Set company logo from invoice.company
          setLogoUrl(invoice.company?.logo_url || '');
          
          // Set discount, tax, shipping
          setDiscountType(invoice.discount_type);
          setDiscountAmount(invoice.discount_amount);
          setTaxType(invoice.tax_type);
          setTaxAmount(invoice.tax_amount);
          setShippingAmount(invoice.shipping_amount);
          setShowDiscount(invoice.discount_amount !== null && invoice.discount_amount > 0);
          setShowTax(invoice.tax_amount !== null && invoice.tax_amount > 0);
          setShowShipping(invoice.shipping_amount !== null && invoice.shipping_amount > 0);
          
          // Set items
          setItems(invoice.items.length > 0 ? invoice.items : [{ name: '', quantity: 1, unit_price: 0 }]);
        } else {
          // For new invoice, set defaults from first company
          if (companiesData.length > 0) {
            const firstCompany = companiesData[0];
            setCompanyId(firstCompany.id);
            setLogoUrl(firstCompany.logo_url || '');
            setTerms(firstCompany.terms || '');
            setTemplateId(firstCompany.template_id);
            setCurrencyId(firstCompany.currency_id);
            
            if (firstCompany.tax_percent !== null && firstCompany.tax_percent !== undefined && firstCompany.tax_percent > 0) {
              setTaxType('percent');
              setTaxAmount(firstCompany.tax_percent);
              setShowTax(true);
            }
          }
          
          // Generate invoice number
          setInvoiceNumber(`INV-${Date.now()}`);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update logo, terms, tax, currency, and template when company changes
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setLogoUrl(company.logo_url || '');
      setTerms(company.terms || '');
      setTemplateId(company.template_id);
      setCurrencyId(company.currency_id);
      
      // Update tax settings from company
      if (company.tax_percent !== null && company.tax_percent !== undefined && company.tax_percent > 0) {
        setTaxType('percent');
        setTaxAmount(company.tax_percent);
        setShowTax(true);
      } else {
        // If company has no tax, reset tax settings
        setTaxType(null);
        setTaxAmount(null);
        setShowTax(false);
      }
    }
  }, [companyId, companies]);

  function getSubtotal(): number {
    return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  }

  function getDiscountAmount(): number {
    const subtotal = getSubtotal();
    if (discountType === 'percent' && discountAmount) {
      return (subtotal * discountAmount) / 100;
    }
    return discountAmount || 0;
  }

  function getTaxAmount(): number {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const afterDiscount = subtotal - discount;
    if (taxType === 'percent' && taxAmount) {
      return (afterDiscount * taxAmount) / 100;
    }
    return taxAmount || 0;
  }

  function getTotal(): number {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const tax = getTaxAmount();
    return subtotal - discount + tax + (shippingAmount || 0);
  }

  function addItem() {
    setItems([...items, { name: '', quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function addDiscount() {
    setShowDiscount(true);
    setDiscountType('percent');
    setDiscountAmount(0);
  }

  function removeDiscount() {
    setShowDiscount(false);
    setDiscountType(null);
    setDiscountAmount(null);
  }

  function addTax() {
    setShowTax(true);
    setTaxType('percent');
    setTaxAmount(0);
  }

  function removeTax() {
    setShowTax(false);
    setTaxType(null);
    setTaxAmount(null);
  }

  function addShipping() {
    setShowShipping(true);
    setShippingAmount(0);
  }

  function removeShipping() {
    setShowShipping(false);
    setShippingAmount(null);
  }

  async function handleSave() {
    if (!companyId) {
      alert('Company ID is required. Please check your settings.');
      return;
    }

    setSaving(true);
    try {
      const invoiceData: InvoicesPost = {
        company_id: companyId,
        template_id: templateId,
        invoice_number: invoiceNumber,
        customer_name: customerName,
        customer_street: customerStreet,
        customer_city: customerCity,
        customer_zip_code: customerZipCode,
        customer_country: customerCountry,
        issue_date: dateCreated ? dateCreated.toString() : format(new Date(), 'yyyy-MM-dd'),
        due_date: dueDate ? dueDate.toString() : null,
        status: 'pending',
        currency_id: currencyId!,
        discount_type: showDiscount ? discountType : null,
        discount_amount: showDiscount ? discountAmount : null,
        discount_total_amount: showDiscount ? getDiscountAmount() : null,
        tax_type: showTax ? taxType : null,
        tax_amount: showTax ? taxAmount : null,
        tax_total_amount: showTax ? getTaxAmount() : null,
        shipping_type: null,
        shipping_amount: showShipping ? shippingAmount : null,
        shipping_total_amount: showShipping ? shippingAmount : null,
        notes: notes || null,
        terms: terms || null,
        subtotal_amount: getSubtotal(),
        total_amount: getTotal(),
      };

      // Prepare items data
      const itemsData = items.map(item => ({
        name: item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      }));

      console.log('Saving invoice with items:', itemsData);

      if (isNewInvoice) {
        await invoicesApi.create(invoiceData, itemsData);
        addToast({
          title: "Invoice Created",
          description: "Your invoice has been created successfully.",
          color: "success"
        });
        router.push('/');
      } else {
        await invoicesApi.update(params.id as string, invoiceData, itemsData);
        addToast({
          title: "Invoice Updated",
          description: "Your invoice has been updated successfully.",
          color: "success"
        });
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
      addToast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        color: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-default-500">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-content1 rounded-lg p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
            <p className="text-foreground font-semibold">Saving invoice...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex max-xl:flex-col gap-6 mb-6 relative">
          <div className="flex flex-col gap-6 flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">
                {isNewInvoice ? 'New Invoice' : `Edit Invoice ${invoiceNumber}`}
              </h1>
              <div className="flex flex-row gap-2 items-center">
                <Button 
                  color="primary"
                  onClick={handleSave}
                  disabled={saving}
                  startContent={<Save className="h-4 w-4" />}
                >
                  {saving ? 'Saving...' : 'Save Invoice'}
                </Button>
              </div>
            </div>
            <div className="bg-content1 rounded-xl shadow-xs border border-default-200 p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={128} height={64} className="h-16 w-auto mb-4 object-contain" />
                  ) : (
                    <div className="h-16 w-32 bg-default-200 rounded mb-4 flex items-center justify-center text-default-400 text-sm">
                      Logo
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-foreground mb-2">INVOICE</h2>
                  {!isNewInvoice && <p className="text-xl text-default-500">#{invoiceNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-4">
                  <Input
                    label="Customer Name"
                    labelPlacement="outside"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label="Street Address"
                    labelPlacement="outside"
                    value={customerStreet}
                    onChange={(e) => setCustomerStreet(e.target.value)}
                    placeholder="Street address"
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label="City"
                    labelPlacement="outside"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="City"
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label="Zip Code"
                    labelPlacement="outside"
                    value={customerZipCode}
                    onChange={(e) => setCustomerZipCode(e.target.value)}
                    placeholder="Zip code"
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label="Country"
                    labelPlacement="outside"
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    placeholder="Country"
                    className="font-semibold [&_span]:text-default-600"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <DatePicker
                    label="Date"
                    labelPlacement="outside"
                    value={dateCreated}
                    onChange={setDateCreated}
                    showMonthAndYearPickers 
                    className="w-full font-semibold [&_span]:text-default-600"
                  />
                  <DatePicker
                    label="Due Date"
                    labelPlacement="outside"
                    value={dueDate}
                    onChange={setDueDate}
                    showMonthAndYearPickers 
                    className="w-full font-semibold [&_span]:text-default-600"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="grid grid-cols-12 gap-4 mb-3 font-semibold text-sm text-default-600">
                  <div className="col-span-5">Item Name</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 mb-3">
                    <div className="col-span-5">
                      <Input
                        value={item.name || ''}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={String(item.quantity || 1)}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={String(item.unit_price || 0)}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end font-semibold">
                      {getCurrencySymbol()}{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                    </div>
                    <div className="col-span-1 flex items-center">
                      <Button
                        variant="light"
                        color="danger"
                        isIconOnly
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        startContent={<Trash className="h-4 w-4 text-danger" />}
                      >
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={addItem} className="mt-4"
                  startContent={<Plus className="mr-2 h-4 w-4" />}
                >
                  Add Item
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <Textarea
                    label="Notes"
                    labelPlacement="outside"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes"
                    className="min-h-[100px] font-semibold [&_span]:text-default-600"
                  />
                  <Textarea
                    label="Terms & Conditions"
                    labelPlacement="outside"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment terms and conditions"
                    className="min-h-[100px] font-semibold [&_span]:text-default-600"
                  />
                </div>


                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-default-600">Subtotal</span>
                    <span className="text-lg font-semibold">
                      {getCurrencySymbol()}{getSubtotal().toFixed(2)}
                    </span>
                  </div>

                  {showDiscount ? (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">Discount</span>
                        <Button
                          variant="flat"
                          onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')}
                          className="min-w-12"
                        >
                          {discountType === 'percent' ? '%' : getCurrencySymbol()}
                        </Button>
                        <Input
                          type="number"
                          value={String(discountAmount || 0)}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeDiscount}
                          startContent={<Trash className="h-4 w-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold">
                        -{getCurrencySymbol()}{getDiscountAmount().toFixed(2)}
                      </span>
                    </div>
                  ) : null}

                  {showTax ? (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">Tax</span>
                        <Button
                          variant="flat"
                          onClick={() => setTaxType(taxType === 'percent' ? 'fixed' : 'percent')}
                          className="min-w-12"
                        >
                          {taxType === 'percent' ? '%' : getCurrencySymbol()}
                        </Button>
                        <Input
                          type="number"
                          value={String(taxAmount || 0)}
                          onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeTax}
                          startContent={<Trash className="h-4 w-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold">
                        {getCurrencySymbol()}{getTaxAmount().toFixed(2)}
                      </span>
                    </div>
                  ) : null}

                  {showShipping ? (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">Shipping</span>
                        <Input
                          type="number"
                          value={String(shippingAmount || 0)}
                          onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeShipping}
                          startContent={<Trash className="h-4 w-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold">
                        {getCurrencySymbol()}{(shippingAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  ) : null}

                  {(!showDiscount || !showTax || !showShipping) && (
                    <div className="flex gap-2 pt-2">
                      {!showDiscount && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addDiscount}
                          startContent={<Plus className="h-4 w-4" />}
                        >
                          Add Discount
                        </Button>
                      )}
                      {!showTax && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addTax}
                          startContent={<Plus className="h-4 w-4" />}
                        >
                          Add Tax
                        </Button>
                      )}
                      {!showShipping && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addShipping}
                          startContent={<Plus className="h-4 w-4" />}
                        >
                          Add Shipping
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-default-200">
                    <span className="text-xl font-bold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">
                      {getCurrencySymbol()}{getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-xs flex flex-col gap-6">
            {/* Spacer to align with invoice card */}
            <div className="h-10 max-xl:hidden" aria-hidden="true" />
            <div className="h-fit sticky top-8 bg-content1 rounded-xl shadow-xs border border-default-200 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Company</h3>
            <div className="flex flex-col gap-4 mb-6">
              <Select
                aria-label="Company"
                selectionMode="single"
                selectedKeys={companyId ? new Set([companyId]) : new Set()}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) setCompanyId(String(selected));
                }}
                placeholder="Select company"
                classNames={{
                  trigger: "font-semibold"
                }}
              >
                {companies.map((company) => (
                  <SelectItem 
                    key={company.id} 
                    textValue={company.name}
                  >
                    {company.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-4">Invoice Settings</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-default-600 mb-2 block">Template</label>
                <Select
                  aria-label="Template"
                  selectionMode="single"
                  selectedKeys={templateId ? new Set([templateId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setTemplateId(String(selected));
                  }}
                  placeholder="Select template"
                  classNames={{
                    trigger: "font-semibold"
                  }}
                >
                  {templates.map((template) => (
                    <SelectItem 
                      key={template.id} 
                      textValue={template.name}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-default-600 mb-2 block">Currency</label>
                <Select
                  aria-label="Currency"
                  selectionMode="single"
                  selectedKeys={currencyId ? new Set([currencyId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setCurrencyId(String(selected));
                  }}
                  placeholder="Select currency"
                  classNames={{
                    trigger: "font-semibold"
                  }}
                >
                  {currencies.map((currency) => (
                    <SelectItem 
                      key={currency.id} 
                      textValue={`${currency.code} - ${currency.symbol}`}
                    >
                      {currency.code} - {currency.symbol}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
