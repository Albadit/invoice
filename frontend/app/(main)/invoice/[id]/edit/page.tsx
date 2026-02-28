'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/currencies/api';
import { companiesApi } from '@/features/companies/api';
import { templatesApi } from '@/features/templates/api';
import { clientsApi } from '@/features/clients/api';
import type { InvoiceItem, Currency, Company, Template, Client } from '@/lib/types';
import type { InvoicesPost } from '@/lib/database.types';
import { getCurrencySymbol, formatCurrencyAmount } from '@/lib/utils';
import {
  getSubtotal as calcSubtotal,
  getDiscountTotal,
  getTaxTotal,
  getInvoiceTotal,
} from '@/features/invoice/utils/calculations';
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import { Plus, Trash, Save, Settings, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { parseDate, CalendarDate } from '@internationalized/date';
import { addToast } from "@heroui/toast";
import { useTranslation, useLocale } from '@/contexts/LocaleProvider';
import { StickyHeader } from '@/components/ui';

export default function InvoiceEditPage() {
  const { t } = useTranslation('invoice');
  const { languageConfig } = useLocale();
  const params = useParams();
  const router = useRouter();
  const isNewInvoice = params.id === 'new';

  const [loading, setLoading] = useState(!isNewInvoice);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [invoiceCode, setInvoiceCode] = useState('');
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
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([
    { name: '', quantity: 1, unit_price: 0 },
  ]);

  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [taxType, setTaxType] = useState<'percent' | 'fixed' | null>(null);
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [shippingAmount, setShippingAmount] = useState<number | null>(null);
  
  const [showDiscount, setShowDiscount] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Load all dropdown options first
        const [currenciesData, companiesData, templatesData, clientsData] = await Promise.all([
          currenciesApi.getAll(),
          companiesApi.getAll(),
          templatesApi.getAll(),
          clientsApi.list()
        ]);
        
        setCurrencies(currenciesData);
        setCompanies(companiesData);
        setTemplates(templatesData);
        setClients(clientsData);

        if (!isNewInvoice) {
          // Load invoice data with company, currency, and items included
          const invoice = await invoicesApi.getById(params.id as string);
          
          setInvoiceCode(invoice.invoice_code);
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
          setLanguage(invoice.language || 'en');

          // Set client
          setClientId(invoice.client_id || null);

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
            setLanguage(firstCompany.language || 'en');
            
            if (firstCompany.tax_percent !== null && firstCompany.tax_percent !== undefined && firstCompany.tax_percent > 0) {
              setTaxType('percent');
              setTaxAmount(firstCompany.tax_percent);
              setShowTax(true);
            }
          }
          
          // Generate invoice code
          setInvoiceCode(`${Date.now()}`);
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
      setLanguage(company.language || 'en');
      
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

  // Auto-fill customer fields when client changes
  useEffect(() => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setCustomerName(client.name);
      setCustomerStreet(client.street || '');
      setCustomerCity(client.city || '');
      setCustomerZipCode(client.zip_code || '');
      setCustomerCountry(client.country || '');
    }
  }, [clientId, clients]);

  function getSubtotal(): number {
    return calcSubtotal(items.map(i => ({ quantity: i.quantity || 0, unit_price: i.unit_price || 0 })));
  }

  function getDiscountAmount(): number {
    return getDiscountTotal(getSubtotal(), discountType, discountAmount);
  }

  function getTaxAmount(): number {
    return getTaxTotal(getSubtotal() - getDiscountAmount(), taxType, taxAmount);
  }

  function getTotal(): number {
    return getInvoiceTotal({
      items: items.map(i => ({ quantity: i.quantity || 0, unit_price: i.unit_price || 0 })),
      discountType,
      discountAmount,
      taxType,
      taxAmount,
      shippingAmount,
    });
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
      addToast({
        title: 'Error',
        description: 'Company ID is required. Please check your settings.',
        color: 'danger',
      });
      return;
    }

    setSaving(true);
    try {
      const invoiceData: InvoicesPost = {
        company_id: companyId,
        template_id: templateId,
        client_id: clientId || null,
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
        language: language,
        subtotal_amount: getSubtotal(),
        total_amount: getTotal(),
      };

      // Prepare items data
      const itemsData = items.map(item => ({
        name: item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      }));

      if (isNewInvoice) {
        await invoicesApi.create(invoiceData, itemsData);
        addToast({
          title: t('messages.created'),
          description: t('messages.createdDescription'),
          color: "success"
        });
        router.push('/invoice');
      } else {
        await invoicesApi.update(params.id as string, invoiceData, itemsData);
        addToast({
          title: t('messages.updated'),
          description: t('messages.updatedDescription'),
          color: "success"
        });
        router.push('/invoice');
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
      addToast({
        title: t('messages.error'),
        description: t('messages.saveError'),
        color: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-default-500">{t('messages.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-content1 rounded-lg p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full size-12 border-b-2 border-foreground"></div>
            <p className="text-foreground font-semibold">{t('actions.saving')}...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <StickyHeader className="mb-6" title={isNewInvoice ? t('newInvoice') : `${t('editInvoice')} ${invoiceCode}`}>
            <h1 className="hidden lg:block text-xl sm:text-3xl font-bold min-w-0 truncate">
              {isNewInvoice ? t('newInvoice') : `${t('editInvoice')} ${invoiceCode}`}
            </h1>
            <div className="sm:ml-auto shrink-0 flex flex-row gap-2 items-center">
              <Button 
                color="primary"
                className="w-full lg:w-fit"
                onClick={handleSave}
                disabled={saving}
                startContent={<Save className="size-4" />}
              >
                {saving ? t('actions.saving') : t('actions.save')}
              </Button>
            </div>
        </StickyHeader>

        <div className="flex max-xl:flex-col gap-6 relative">
          <div className="flex flex-col gap-6 flex-1">

            {/* Mobile collapsible settings panel */}
            <div className="xl:hidden bg-content1 rounded-xl shadow-xs border border-default-200">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 sm:p-6"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <div className="flex items-center gap-2">
                  <Settings className="size-5 text-default-500" />
                  <span className="text-lg font-semibold text-foreground">{t('settings.invoiceSettings')}</span>
                </div>
                <ChevronDown className={`size-5 text-default-400 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-250 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pb-4 sm:px-6 sm:pb-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-foreground">{t('settings.company')}</h3>
                    <Select
                      aria-label={t('settings.company')}
                      selectionMode="single"
                      selectedKeys={companyId ? new Set([companyId]) : new Set()}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0];
                        if (selected) setCompanyId(String(selected));
                      }}
                      placeholder={t('settings.selectCompany')}
                      classNames={{ trigger: "font-semibold" }}
                    >
                      {companies.map((company) => (
                        <SelectItem key={company.id} textValue={company.name}>{company.name}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-foreground">{t('settings.client')}</h3>
                    <Select
                      aria-label={t('settings.client')}
                      selectionMode="single"
                      selectedKeys={clientId ? new Set([clientId]) : new Set()}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0];
                        setClientId(selected ? String(selected) : null);
                      }}
                      placeholder={t('settings.selectClient')}
                      classNames={{ trigger: "font-semibold" }}
                    >
                      {clients.map((client) => (
                        <SelectItem key={client.id} textValue={client.name}>{client.name}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-default-600">{t('settings.template')}</label>
                      <Select
                        aria-label={t('settings.template')}
                        selectionMode="single"
                        selectedKeys={templateId ? new Set([templateId]) : new Set()}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0];
                          if (selected) setTemplateId(String(selected));
                        }}
                        placeholder={t('settings.selectTemplate')}
                        classNames={{ trigger: "font-semibold" }}
                      >
                        {templates.map((template) => (
                          <SelectItem key={template.id} textValue={template.name}>{template.name}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-default-600">{t('settings.currency')}</label>
                      <Select
                        aria-label={t('settings.currency')}
                        selectionMode="single"
                        selectedKeys={currencyId ? new Set([currencyId]) : new Set()}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0];
                          if (selected) setCurrencyId(String(selected));
                        }}
                        placeholder={t('settings.selectCurrency')}
                        classNames={{ trigger: "font-semibold" }}
                      >
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} textValue={`${currency.code} - ${currency.symbol}`}>{currency.code} - {currency.symbol}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-default-600">{t('settings.language')}</label>
                      <Select
                        aria-label={t('settings.language')}
                        selectionMode="single"
                        selectedKeys={new Set([language])}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0];
                          if (selected) setLanguage(String(selected));
                        }}
                        placeholder={t('settings.selectLanguage')}
                        classNames={{ trigger: "font-semibold" }}
                        renderValue={() => {
                          const selected = languageConfig.find(l => l.key === language);
                          if (!selected) return null;
                          return (
                            <div className="flex items-center gap-2">
                              <Image src={selected.flag} alt={selected.name} width={20} height={16} unoptimized className="w-5 h-4 object-cover rounded-sm" />
                              <span>{selected.name}</span>
                            </div>
                          );
                        }}
                      >
                        {languageConfig.map((lang) => (
                          <SelectItem
                            key={lang.key}
                            textValue={lang.name}
                            startContent={<Image src={lang.flag} alt={lang.name} width={20} height={16} unoptimized className="w-5 h-4 object-cover rounded-sm" />}
                          >
                            {lang.name}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-content1 rounded-xl shadow-xs border border-default-200 p-4 sm:p-8 flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={128} height={64} unoptimized className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-32 bg-default-200 rounded flex items-center justify-center text-default-400 text-sm">
                      Logo
                    </div>
                  )}
                </div>
                <div className="sm:text-right flex flex-col gap-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">INVOICE</h2>
                  {!isNewInvoice && <p className="text-lg sm:text-xl text-default-500">#{invoiceCode}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <Input
                    label={t('customerName')}
                    labelPlacement="outside"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('customerName')}
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label={t('streetAddress')}
                    labelPlacement="outside"
                    value={customerStreet}
                    onChange={(e) => setCustomerStreet(e.target.value)}
                    placeholder={t('streetAddress')}
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label={t('city')}
                    labelPlacement="outside"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder={t('city')}
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label={t('zipCode')}
                    labelPlacement="outside"
                    value={customerZipCode}
                    onChange={(e) => setCustomerZipCode(e.target.value)}
                    placeholder={t('zipCode')}
                    className="font-semibold [&_span]:text-default-600"
                  />
                  <Input
                    label={t('country')}
                    labelPlacement="outside"
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    placeholder={t('country')}
                    className="font-semibold [&_span]:text-default-600"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <DatePicker
                    label={t('date')}
                    labelPlacement="outside"
                    value={dateCreated}
                    onChange={setDateCreated}
                    showMonthAndYearPickers 
                    className="w-full font-semibold [&_span]:text-default-600"
                  />
                  <div className="flex gap-2 items-end">
                    <DatePicker
                      label={t('dueDate')}
                      labelPlacement="outside"
                      value={dueDate}
                      onChange={setDueDate}
                      showMonthAndYearPickers 
                      className="w-2/3 sm:w-1/2 font-semibold [&_span]:text-default-600"
                    />
                    <Input
                      label={t('dueDays')}
                      labelPlacement="outside"
                      type="number"
                      min="0"
                      value={dueDate && dateCreated ? String(Math.max(0, Math.round((new Date(dueDate.toString()).getTime() - new Date(dateCreated.toString()).getTime()) / 86400000))) : ''}
                      onChange={(e) => {
                        const days = parseInt(e.target.value);
                        if (!isNaN(days) && days >= 0 && dateCreated) {
                          const base = new Date(dateCreated.toString());
                          base.setDate(base.getDate() + days);
                          setDueDate(parseDate(format(base, 'yyyy-MM-dd')));
                        } else if (e.target.value === '') {
                          setDueDate(null);
                        }
                      }}
                      className="w-1/3 sm:w-1/2 font-semibold [&_span]:text-default-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:gap-3">
                <div className="hidden sm:grid grid-cols-12 gap-4 font-semibold text-sm text-default-600">
                  <div className="col-span-5">{t('fields.item')}</div>
                  <div className="col-span-2">{t('fields.quantity')}</div>
                  <div className="col-span-2">{t('fields.rate')}</div>
                  <div className="col-span-2 text-right">{t('fields.amount')}</div>
                  <div className="col-span-1"></div>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 border-b sm:border-0 pb-4 sm:pb-0 border-default-200">
                    <div className="sm:col-span-5">
                      <Input
                        label={undefined}
                        aria-label={t('fields.item')}
                        value={item.name || ''}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder={t('fields.description')}
                        startContent={<span className="text-xs text-default-400 sm:hidden">{t('fields.item')}</span>}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        aria-label={t('fields.quantity')}
                        value={String(item.quantity || 1)}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        startContent={<span className="text-xs text-default-400 sm:hidden">{t('fields.quantity')}</span>}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        aria-label={t('fields.rate')}
                        value={String(item.unit_price || 0)}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        startContent={<span className="text-xs text-default-400 sm:hidden">{t('fields.rate')}</span>}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end font-semibold">
                      <span className="text-xs text-default-400 sm:hidden">{t('fields.amount')}</span>
                      {formatCurrencyAmount(currencies, currencyId, ((item.quantity || 0) * (item.unit_price || 0)).toFixed(2))}
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-end sm:justify-start">
                      <Button
                        variant="light"
                        color="danger"
                        isIconOnly
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        startContent={<Trash className="size-4 text-danger" />}
                      >
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={addItem}
                  startContent={<Plus className="size-4" />}
                >
                  {t('actions.addItem')}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <Textarea
                    label={t('fields.notes')}
                    labelPlacement="outside"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('fields.notes')}
                    className="min-h-25 font-semibold [&_span]:text-default-600"
                  />
                  <Textarea
                    label={t('fields.terms')}
                    labelPlacement="outside"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder={t('fields.terms')}
                    className="min-h-25 font-semibold [&_span]:text-default-600"
                  />
                </div>


                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-default-600">{t('fields.subtotal')}</span>
                    <span className="text-lg font-semibold">
                      {formatCurrencyAmount(currencies, currencyId, getSubtotal().toFixed(2))}
                    </span>
                  </div>

                  {showDiscount ? (
                    <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">{t('fields.discount')}</span>
                        <Button
                          variant="flat"
                          onClick={() => setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')}
                          className="min-w-12"
                        >
                          {discountType === 'percent' ? '%' : getCurrencySymbol(currencies, currencyId)}
                        </Button>
                        <Input
                          type="number"
                          value={String(discountAmount || 0)}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-18"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeDiscount}
                          startContent={<Trash className="size-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold ml-auto">
                        -{formatCurrencyAmount(currencies, currencyId, getDiscountAmount().toFixed(2))}
                      </span>
                    </div>
                  ) : null}

                  {showTax ? (
                    <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">{t('fields.tax')}</span>
                        <Button
                          variant="flat"
                          onClick={() => setTaxType(taxType === 'percent' ? 'fixed' : 'percent')}
                          className="min-w-12"
                        >
                          {taxType === 'percent' ? '%' : getCurrencySymbol(currencies, currencyId)}
                        </Button>
                        <Input
                          type="number"
                          value={String(taxAmount || 0)}
                          onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                          className="w-18"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeTax}
                          startContent={<Trash className="size-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold ml-auto">
                        {formatCurrencyAmount(currencies, currencyId, getTaxAmount().toFixed(2))}
                      </span>
                    </div>
                  ) : null}

                  {showShipping ? (
                    <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-600">{t('fields.shipping')}</span>
                        <Input
                          type="number"
                          value={String(shippingAmount || 0)}
                          onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                          className="w-18"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={removeShipping}
                          startContent={<Trash className="size-4 text-danger" />}
                        />
                      </div>
                      <span className="text-lg font-semibold ml-auto">
                        {formatCurrencyAmount(currencies, currencyId, (shippingAmount || 0).toFixed(2))}
                      </span>
                    </div>
                  ) : null}

                  {(!showDiscount || !showTax || !showShipping) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {!showDiscount && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addDiscount}
                          startContent={<Plus className="size-4" />}
                        >
                          {t('actions.addDiscount')}
                        </Button>
                      )}
                      {!showTax && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addTax}
                          startContent={<Plus className="size-4" />}
                        >
                          {t('actions.addTax')}
                        </Button>
                      )}
                      {!showShipping && (
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={addShipping}
                          startContent={<Plus className="size-4" />}
                        >
                          {t('actions.addShipping')}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-default-200">
                    <span className="text-xl font-bold text-foreground">{t('fields.total')}</span>
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrencyAmount(currencies, currencyId, getTotal().toFixed(2))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full xl:min-w-xs xl:max-w-xs hidden xl:flex flex-col gap-6">
            {/* Spacer to align with invoice card */}
            <div className="h-fit xl:sticky xl:top-22 bg-content1 rounded-xl shadow-xs border border-default-200 p-4 sm:p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-foreground">{t('settings.company')}</h3>
                <Select
                  aria-label={t('settings.company')}
                  selectionMode="single"
                  selectedKeys={companyId ? new Set([companyId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setCompanyId(String(selected));
                  }}
                  placeholder={t('settings.selectCompany')}
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

              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-foreground">{t('settings.client')}</h3>
                <Select
                  aria-label={t('settings.client')}
                  selectionMode="single"
                  selectedKeys={clientId ? new Set([clientId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    setClientId(selected ? String(selected) : null);
                  }}
                  placeholder={t('settings.selectClient')}
                  classNames={{
                    trigger: "font-semibold"
                  }}
                >
                  {clients.map((client) => (
                    <SelectItem 
                      key={client.id} 
                      textValue={client.name}
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

            <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-foreground">{t('settings.invoiceSettings')}</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-600">{t('settings.template')}</label>
                <Select
                  aria-label={t('settings.template')}
                  selectionMode="single"
                  selectedKeys={templateId ? new Set([templateId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setTemplateId(String(selected));
                  }}
                  placeholder={t('settings.selectTemplate')}
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-600">{t('settings.currency')}</label>
                <Select
                  aria-label={t('settings.currency')}
                  selectionMode="single"
                  selectedKeys={currencyId ? new Set([currencyId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setCurrencyId(String(selected));
                  }}
                  placeholder={t('settings.selectCurrency')}
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-600">{t('settings.language')}</label>
                <Select
                  aria-label={t('settings.language')}
                  selectionMode="single"
                  selectedKeys={new Set([language])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) setLanguage(String(selected));
                  }}
                  placeholder={t('settings.selectLanguage')}
                  classNames={{
                    trigger: "font-semibold"
                  }}
                  renderValue={() => {
                    const selected = languageConfig.find(l => l.key === language);
                    if (!selected) return null;
                    return (
                      <div className="flex items-center gap-2">
                        <Image src={selected.flag} alt={selected.name} width={20} height={16} unoptimized className="w-5 h-4 object-cover rounded-sm" />
                        <span>{selected.name}</span>
                      </div>
                    );
                  }}
                >
                  {languageConfig.map((lang) => (
                    <SelectItem 
                      key={lang.key} 
                      textValue={lang.name}
                      startContent={
                        <Image src={lang.flag} alt={lang.name} width={20} height={16} unoptimized className="w-5 h-4 object-cover rounded-sm" />
                      }
                    >
                      {lang.name}
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
