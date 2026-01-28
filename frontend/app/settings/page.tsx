'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { currenciesApi, templatesApi, companiesApi } from '@/features/settings/api';
import type { Currency, Template, Company } from '@/lib/types';
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Save, Edit } from 'lucide-react';
import { addToast } from "@heroui/toast";
import {
  AddCompanyModal,
  EditCompanyModal,
  ManageCompaniesModal,
  ManageTemplatesModal,
  EditTemplateModal,
  AddTemplateModal,
  ManageCurrenciesModal,
  EditCurrencyModal,
  AddCurrencyModal,
  LogoUpload,
} from '@/features/settings/components';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [logoUrl, setLogoUrl] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [terms, setTerms] = useState('');
  const [tax, setTax] = useState<number | null>(null);
  const [currencyId, setCurrencyId] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyZipCode, setCompanyZipCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isManageCompaniesModalOpen, setIsManageCompaniesModalOpen] = useState(false);
  const [, setSelectedCompany] = useState<Company | null>(null);
  const [isManageTemplatesModalOpen, setIsManageTemplatesModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isManageCurrenciesModalOpen, setIsManageCurrenciesModalOpen] = useState(false);
  const [isEditCurrencyModalOpen, setIsEditCurrencyModalOpen] = useState(false);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [imageError, setImageError] = useState(false);

  // Refs for scrolling to sections
  const companiesRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const currenciesRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadSettings();
    loadCurrencies();
    loadTemplates();
    loadCompanies();
  }, []);

  // Handle tab query parameter for scrolling
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && !loading) {
      const refs: Record<string, React.RefObject<HTMLElement | null>> = {
        companies: companiesRef,
        templates: templatesRef,
        currencies: currenciesRef,
      };
      const targetRef = refs[tab];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [searchParams, loading]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function loadTemplates() {
    try {
      const templatesData = await templatesApi.getAll();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function loadCompanies() {
    try {
      const companiesData = await companiesApi.getAll();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }

  async function handleCompanyChange(selectedCompanyId: string) {
    setCompanyId(selectedCompanyId);
    
    try {
      // Load company data
      const company = await companiesApi.getById(selectedCompanyId);
      setCompanyName(company.name);
      setCompanyEmail(company.email || '');
      setCompanyPhone(company.phone || '');
      setCompanyStreet(company.street || '');
      setCompanyCity(company.city || '');
      setCompanyZipCode(company.zip_code || '');
      setCompanyCountry(company.country || '');
      setLogoUrl(company.logo_url || '');
      setTemplateId(company.template_id);
      setTerms(company.terms || '');
      setTax(company.tax_percent);
      setCurrencyId(company.currency_id);
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  }

  async function handleAddCompany(companyData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }) {
    try {
      const newCompany = await companiesApi.create({
        name: companyData.name,
        email: companyData.email || null,
        phone: companyData.phone || null,
        street: companyData.street || null,
        city: companyData.city || null,
        zip_code: companyData.zipCode || null,
        country: companyData.country || null,
        logo_url: logoUrl || null,
        template_id: templateId,
        currency_id: currencyId,
        tax_percent: tax,
        terms: terms || null,
      });

      // Reload companies list
      await loadCompanies();
      
      // Select the new company and load its data
      await handleCompanyChange(newCompany.id);
      
      // Close modal and reopen manage modal
      setIsAddCompanyModalOpen(false);
      setIsManageCompaniesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Company created successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create company:', error);
      addToast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleEditCompany(companyData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }) {
    if (!companyId) return;

    try {
      await companiesApi.update(companyId, {
        name: companyData.name,
        email: companyData.email || null,
        phone: companyData.phone || null,
        street: companyData.street || null,
        city: companyData.city || null,
        zip_code: companyData.zipCode || null,
        country: companyData.country || null,
      });

      // Update local state
      setCompanyName(companyData.name);
      setCompanyEmail(companyData.email);
      setCompanyPhone(companyData.phone);
      setCompanyStreet(companyData.street);
      setCompanyCity(companyData.city);
      setCompanyZipCode(companyData.zipCode);
      setCompanyCountry(companyData.country);

      // Reload companies list
      await loadCompanies();
      
      // Close modal and reopen manage modal
      setIsEditCompanyModalOpen(false);
      setSelectedCompany(null);
      setIsManageCompaniesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Company updated successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update company:', error);
      addToast({
        title: "Error",
        description: "Failed to update company. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleDeleteCompany(companyIdToDelete: string) {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      await companiesApi.delete(companyIdToDelete);
      
      // If the deleted company was the currently selected one, clear the fields
      if (companyId === companyIdToDelete) {
        setCompanyId(null);
        setCompanyName('');
        setCompanyEmail('');
        setCompanyPhone('');
        setCompanyStreet('');
        setCompanyCity('');
        setCompanyZipCode('');
        setCompanyCountry('');
        setLogoUrl('');
      }
      
      // Reload companies list
      await loadCompanies();
      
      addToast({
        title: "Success",
        description: "Company and associated settings deleted successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to delete company:', error);
      addToast({
        title: "Error",
        description: "Failed to delete company. It may be in use by invoices.",
        color: "danger"
      });
    }
  }

  async function handleAddTemplate(templateData: {
    name: string;
    styling: string;
  }) {
    try {
      await templatesApi.create(templateData);
      
      await loadTemplates();
      
      setIsAddTemplateModalOpen(false);
      setIsManageTemplatesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Template created successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      addToast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleEditTemplate(templateData: {
    name: string;
    styling: string;
  }) {
    if (!selectedTemplate) return;

    try {
      await templatesApi.update(selectedTemplate.id, templateData);
      
      await loadTemplates();
      
      setIsEditTemplateModalOpen(false);
      setSelectedTemplate(null);
      setIsManageTemplatesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Template updated successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update template:', error);
      addToast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await templatesApi.delete(templateId);
      
      await loadTemplates();
      
      addToast({
        title: "Success",
        description: "Template deleted successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      addToast({
        title: "Error",
        description: "Failed to delete template. It may be in use by invoices.",
        color: "danger"
      });
    }
  }

  async function handleAddCurrency(currencyData: {
    code: string;
    name: string;
    symbol: string;
  }) {
    try {
      await currenciesApi.create(currencyData);
      
      await loadCurrencies();
      
      setIsAddCurrencyModalOpen(false);
      setIsManageCurrenciesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Currency created successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create currency:', error);
      addToast({
        title: "Error",
        description: "Failed to create currency. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleEditCurrency(currencyData: {
    code: string;
    name: string;
    symbol: string;
  }) {
    if (!selectedCurrency) return;

    try {
      await currenciesApi.update(selectedCurrency.id, currencyData);
      
      await loadCurrencies();
      
      setIsEditCurrencyModalOpen(false);
      setSelectedCurrency(null);
      setIsManageCurrenciesModalOpen(true);
      
      addToast({
        title: "Success",
        description: "Currency updated successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update currency:', error);
      addToast({
        title: "Error",
        description: "Failed to update currency. Please try again.",
        color: "danger"
      });
      throw error;
    }
  }

  async function handleDeleteCurrency(currencyId: string) {
    if (!confirm('Are you sure you want to delete this currency? This action cannot be undone.')) {
      return;
    }

    try {
      await currenciesApi.delete(currencyId);
      
      await loadCurrencies();
      
      addToast({
        title: "Success",
        description: "Currency deleted successfully",
        color: "success"
      });
    } catch (error) {
      console.error('Failed to delete currency:', error);
      addToast({
        title: "Error",
        description: "Failed to delete currency. It may be in use by invoices.",
        color: "danger"
      });
    }
  }

  async function loadCurrencies() {
    try {
      const currenciesData = await currenciesApi.getAll();
      setCurrencies(currenciesData);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  }

  async function loadSettings() {
    try {
      const companiesData = await companiesApi.getAll();
      if (companiesData.length > 0) {
        const firstCompany = companiesData[0];
        setCompanyId(firstCompany.id);
        setCompanyName(firstCompany.name);
        setCompanyEmail(firstCompany.email || '');
        setCompanyPhone(firstCompany.phone || '');
        setCompanyStreet(firstCompany.street || '');
        setCompanyCity(firstCompany.city || '');
        setCompanyZipCode(firstCompany.zip_code || '');
        setCompanyCountry(firstCompany.country || '');
        setLogoUrl(firstCompany.logo_url || '');
        setTemplateId(firstCompany.template_id);
        setTerms(firstCompany.terms || '');
        setTax(firstCompany.tax_percent);
        setCurrencyId(firstCompany.currency_id);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!companyId) {
      addToast({
        title: "Error",
        description: "No company selected. Please select a company first.",
        color: "danger"
      });
      return;
    }

    setSaving(true);
    try {
      await companiesApi.update(companyId, {
        logo_url: logoUrl || null,
        template_id: templateId,
        terms: terms || null,
        tax_percent: tax,
        currency_id: currencyId,
      });
      addToast({
        title: "Settings Saved",
        description: "Your invoice preferences have been updated successfully.",
        color: "success"
      });
      setCooldown(6);
    } catch (error) {
      console.error('Failed to save settings:', error);
      addToast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        color: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-8">
      <section className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-default-500 mt-1">Customize your invoice preferences</p>
        </div>
        <div className="flex gap-3">
          <Button
            color="primary"
            onClick={handleSave}
            disabled={saving || cooldown > 0}
            startContent={<Save className="h-4 w-4" />}
            >
            {saving ? 'Saving...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Save Changes'}
          </Button>
        </div>
      </section>

      <Card>
        <CardBody className='flex gap-8 p-6'>
          <section id="companies" ref={companiesRef} className="border-b pb-6 scroll-mt-24">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-semibold">
                Select Company
              </span>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<Edit className="h-4 w-4" />}
                onClick={() => setIsManageCompaniesModalOpen(true)}
              >
                Manage Companies
              </Button>
            </div>
            <Select
              label="Choose a company for your invoices."
              selectedKeys={companyId ? [String(companyId)] : []}
              onSelectionChange={(keys) => handleCompanyChange(String(Array.from(keys)[0]))}
              placeholder="Select a company"
              labelPlacement="outside"
              isRequired
            >
              {companies.map((company) => (
                <SelectItem key={String(company.id)} textValue={company.name}>
                  {company.name}
                </SelectItem>
              ))}
            </Select>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Invoice Logo</h2>
            <div className="space-y-4">
              <div>
                <span className="text-base font-semibold mb-2 block">
                  Upload Logo
                </span>
                <LogoUpload
                  logoUrl={logoUrl}
                  onLogoUrlChange={setLogoUrl}
                  imageError={imageError}
                  onImageError={setImageError}
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-divider"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-content1 text-default-500">OR</span>
                </div>
              </div>

              <div>
                <span className="text-base font-semibold">
                  Logo URL
                </span>
                <Input
                  label="Enter the URL of your company logo if hosted elsewhere."
                  labelPlacement="outside"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setImageError(false);
                  }}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </section>

          <section id="templates" ref={templatesRef} className="flex flex-col gap-6 scroll-mt-24">
            <h2 className="text-2xl font-bold">Invoice Settings</h2>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold">
                  Template Style
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<Edit className="h-4 w-4" />}
                  onClick={() => setIsManageTemplatesModalOpen(true)}
                >
                  Manage Templates
                </Button>
              </div>
              <Select
                label="Choose a template style for your invoices (both editing and viewing)."
                selectedKeys={templateId ? [String(templateId)] : []}
                onSelectionChange={(keys) => setTemplateId(String(Array.from(keys)[0]))}
                labelPlacement="outside"
                isRequired
              >
                {templates.map((tmpl) => (
                  <SelectItem key={String(tmpl.id)}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div id="currencies" ref={currenciesRef} className="scroll-mt-24">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold">
                  Default Currency
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<Edit className="h-4 w-4" />}
                  onClick={() => setIsManageCurrenciesModalOpen(true)}
                >
                  Manage Currencies
                </Button>
              </div>
              <Select
                label="Set the default currency for new invoices."
                selectedKeys={currencyId ? [String(currencyId)] : []}
                onSelectionChange={(keys) => setCurrencyId(String(Array.from(keys)[0]))}
                labelPlacement="outside"
                isRequired
              >
                {currencies.map((currency) => (
                  <SelectItem 
                    key={String(currency.id)} 
                    textValue={`${currency.code} - ${currency.name} (${currency.symbol})`}
                  >
                    {currency.code} - {currency.name} ({currency.symbol})
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <span className="text-base font-semibold">
                Default Tax (%)
              </span>
              <Input
                label="Set the default tax percentage for new invoices."
                labelPlacement="outside"
                type="number"
                value={tax !== null ? String(tax) : ''}
                onChange={(e) => setTax(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
                min="0"
                step="0.01"
                isRequired
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6">Default Terms & Conditions</h2>
            <div>
              <span className="text-base font-semibold">
                Terms Text
              </span>
              <Textarea
                label="Set default terms and conditions that will appear on new invoices. You can still edit this for individual invoices."
                labelPlacement="outside"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter your default terms and conditions..."
                className="text-base"
              />
            </div>
          </section>
        </CardBody>
        <CardFooter className="p-6">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>Tip:</strong> Include payment terms, late fees, accepted payment methods,
              and any other important information your clients should know.
            </p>
          </div>
        </CardFooter>
      </Card>

      <ManageCompaniesModal
        isOpen={isManageCompaniesModalOpen}
        onClose={() => setIsManageCompaniesModalOpen(false)}
        companies={companies}
        onEdit={(company) => {
          setSelectedCompany(company);
          setCompanyId(company.id);
          setCompanyName(company.name);
          setCompanyEmail(company.email || '');
          setCompanyPhone(company.phone || '');
          setCompanyStreet(company.street || '');
          setCompanyCity(company.city || '');
          setCompanyZipCode(company.zip_code || '');
          setCompanyCountry(company.country || '');
          setIsManageCompaniesModalOpen(false);
          setIsEditCompanyModalOpen(true);
        }}
        onDelete={handleDeleteCompany}
        onAdd={() => {
          setIsManageCompaniesModalOpen(false);
          setIsAddCompanyModalOpen(true);
        }}
      />

      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => {
          setIsAddCompanyModalOpen(false);
          setIsManageCompaniesModalOpen(true);
        }}
        onSave={handleAddCompany}
      />

      <EditCompanyModal
        isOpen={isEditCompanyModalOpen}
        onClose={() => {
          setIsEditCompanyModalOpen(false);
          setSelectedCompany(null);
          setIsManageCompaniesModalOpen(true);
        }}
        onSave={handleEditCompany}
        initialData={{
          name: companyName,
          email: companyEmail,
          phone: companyPhone,
          street: companyStreet,
          city: companyCity,
          zipCode: companyZipCode,
          country: companyCountry,
        }}
      />

      <ManageTemplatesModal
        isOpen={isManageTemplatesModalOpen}
        onClose={() => setIsManageTemplatesModalOpen(false)}
        templates={templates}
        onEdit={(template) => {
          setSelectedTemplate(template);
          setIsManageTemplatesModalOpen(false);
          setIsEditTemplateModalOpen(true);
        }}
        onDelete={handleDeleteTemplate}
        onAdd={() => {
          setIsManageTemplatesModalOpen(false);
          setIsAddTemplateModalOpen(true);
        }}
      />

      <AddTemplateModal
        isOpen={isAddTemplateModalOpen}
        onClose={() => {
          setIsAddTemplateModalOpen(false);
          setIsManageTemplatesModalOpen(true);
        }}
        onSave={handleAddTemplate}
      />

      <EditTemplateModal
        isOpen={isEditTemplateModalOpen}
        onClose={() => {
          setIsEditTemplateModalOpen(false);
          setSelectedTemplate(null);
          setIsManageTemplatesModalOpen(true);
        }}
        onSave={handleEditTemplate}
        template={selectedTemplate}
      />

      <ManageCurrenciesModal
        isOpen={isManageCurrenciesModalOpen}
        onClose={() => setIsManageCurrenciesModalOpen(false)}
        currencies={currencies}
        onEdit={(currency) => {
          setSelectedCurrency(currency);
          setIsManageCurrenciesModalOpen(false);
          setIsEditCurrencyModalOpen(true);
        }}
        onDelete={handleDeleteCurrency}
        onAdd={() => {
          setIsManageCurrenciesModalOpen(false);
          setIsAddCurrencyModalOpen(true);
        }}
      />

      <AddCurrencyModal
        isOpen={isAddCurrencyModalOpen}
        onClose={() => {
          setIsAddCurrencyModalOpen(false);
          setIsManageCurrenciesModalOpen(true);
        }}
        onSave={handleAddCurrency}
      />

      <EditCurrencyModal
        isOpen={isEditCurrencyModalOpen}
        onClose={() => {
          setIsEditCurrencyModalOpen(false);
          setSelectedCurrency(null);
          setIsManageCurrenciesModalOpen(true);
        }}
        onSave={handleEditCurrency}
        currency={selectedCurrency}
      />
    </main>
  );
}
