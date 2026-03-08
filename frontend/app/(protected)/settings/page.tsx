'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { currenciesApi } from '@/features/currencies/api';
import { templatesApi } from '@/features/templates/api';
import { companiesApi, storageApi } from '@/features/companies/api';
import { clientsApi } from '@/features/clients/api';
import type { Currency, Template, Company, Client } from '@/lib/types';
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import Image from 'next/image';
import { Save, Edit, Building2 } from 'lucide-react';
import { addToast } from "@heroui/toast";
import {
  AddCompanyModal,
  EditCompanyModal,
  ManageCompaniesModal,
  LogoUpload,
} from '@/features/companies/components';
import {
  ManageTemplatesModal,
  EditTemplateModal,
  AddTemplateModal,
} from '@/features/templates/components';
import {
  ManageCurrenciesModal,
  EditCurrencyModal,
  AddCurrencyModal,
} from '@/features/currencies/components';
import {
  AddClientModal,
  EditClientModal,
  ManageClientsModal,
} from '@/features/clients/components';
import { ConfirmModal, StickyHeader } from '@/components/ui';
import { useTranslation, useLocale } from '@/contexts/LocaleProvider';
import { usePermissions } from '@/features/auth/components';


export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { languageConfig } = useLocale();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [logoUrl, setLogoUrl] = useState('');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const savedLogoUrlRef = useRef('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [terms, setTerms] = useState('');
  const [tax, setTax] = useState<number | null>(null);
  const [currencyId, setCurrencyId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en');
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
  const [companyVatNumber, setCompanyVatNumber] = useState('');
  const [companyCocNumber, setCompanyCocNumber] = useState('');
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
  const [isManageClientsModalOpen, setIsManageClientsModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [imageError, setImageError] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ template?: boolean; currency?: boolean; tax?: boolean }>({});



  // Refs for scrolling to sections
  const companiesRef = useRef<HTMLDivElement>(null);
  const clientsRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const currenciesRef = useRef<HTMLDivElement>(null);
  const scrollUpdateRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadSettings();
    loadClients();
  }, []);

  // Handle tab query parameter for scrolling (skip when triggered by scroll listener)
  useEffect(() => {
    if (scrollUpdateRef.current) {
      scrollUpdateRef.current = false;
      return;
    }
    const tab = searchParams.get('tab');
    if (tab && !loading) {
      const refs: Record<string, React.RefObject<HTMLElement | null>> = {
        companies: companiesRef,
        clients: clientsRef,
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

  // Update ?tab= when user stops scrolling (debounced)
  useEffect(() => {
    if (loading) return;
    const sections = [
      { id: 'companies', ref: companiesRef },
      { id: 'clients', ref: clientsRef },
      { id: 'templates', ref: templatesRef },
      { id: 'currencies', ref: currenciesRef },
    ];
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const offset = window.innerHeight * 0.3;
        let active: string | null = null;
        for (const { id, ref } of sections) {
          const el = ref.current;
          if (el && el.getBoundingClientRect().top <= offset) {
            active = id;
          }
        }
        if (active && active !== searchParams.get('tab')) {
          scrollUpdateRef.current = true;
          router.replace(`${pathname}?tab=${active}`, { scroll: false });
        }
      }, 150);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [loading, pathname, router, searchParams]);

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
      setCompanyVatNumber(company.vat_number || '');
      setCompanyCocNumber(company.coc_number || '');
      setLogoUrl(company.logo_url || '');
      savedLogoUrlRef.current = company.logo_url || '';
      setPendingLogoFile(null);
      setTemplateId(company.template_id);
      setTerms(company.terms || '');
      setTax(company.tax_percent);
      setCurrencyId(company.currency_id);
      setLanguage(company.language || 'en');
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
    vatNumber: string;
    cocNumber: string;
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
        vat_number: companyData.vatNumber || null,
        coc_number: companyData.cocNumber || null,
        logo_url: logoUrl || null,
        template_id: templateId,
        currency_id: currencyId,
        tax_percent: tax,
        terms: terms || null,
        language: language,
      });

      // Reload companies list
      await loadCompanies();
      
      // Select the new company and load its data
      await handleCompanyChange(newCompany.id);
      
      // Close modal and reopen manage modal
      setIsAddCompanyModalOpen(false);
      setIsManageCompaniesModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('companies.messages.created'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create company:', error);
      addToast({
        title: t('messages.error'),
        description: t('companies.messages.createError'),
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
    vatNumber: string;
    cocNumber: string;
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
        vat_number: companyData.vatNumber || null,
        coc_number: companyData.cocNumber || null,
      });

      // Update local state
      setCompanyName(companyData.name);
      setCompanyEmail(companyData.email);
      setCompanyPhone(companyData.phone);
      setCompanyStreet(companyData.street);
      setCompanyCity(companyData.city);
      setCompanyZipCode(companyData.zipCode);
      setCompanyCountry(companyData.country);
      setCompanyVatNumber(companyData.vatNumber);
      setCompanyCocNumber(companyData.cocNumber);

      // Reload companies list
      await loadCompanies();
      
      // Close modal and reopen manage modal
      setIsEditCompanyModalOpen(false);
      setSelectedCompany(null);
      setIsManageCompaniesModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('companies.messages.updated'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update company:', error);
      addToast({
        title: t('messages.error'),
        description: t('companies.messages.updateError'),
        color: "danger"
      });
      throw error;
    }
  }

  function handleDeleteCompany(companyIdToDelete: string) {
    setConfirmModal({
      isOpen: true,
      title: t('companies.deleteCompany'),
      message: t('companies.messages.confirmDelete'),
      action: async () => {
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
            setCompanyVatNumber('');
            setCompanyCocNumber('');
            setLogoUrl('');
          }
          
          // Reload companies list
          await loadCompanies();
          
          addToast({
            title: t('messages.success'),
            description: t('companies.messages.deleted'),
            color: "success"
          });
        } catch (error) {
          console.error('Failed to delete company:', error);
          addToast({
            title: t('messages.error'),
            description: t('companies.messages.deleteError'),
            color: "danger"
          });
        }
      },
    });
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
        title: t('messages.success'),
        description: t('templates.messages.created'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      addToast({
        title: t('messages.error'),
        description: t('templates.messages.createError'),
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
        title: t('messages.success'),
        description: t('templates.messages.updated'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update template:', error);
      addToast({
        title: t('messages.error'),
        description: t('templates.messages.updateError'),
        color: "danger"
      });
      throw error;
    }
  }

  function handleDeleteTemplate(templateId: string) {
    setConfirmModal({
      isOpen: true,
      title: t('templates.deleteTemplate'),
      message: t('templates.messages.confirmDelete'),
      action: async () => {
        try {
          await templatesApi.delete(templateId);
          
          await loadTemplates();
          
          addToast({
            title: t('messages.success'),
            description: t('templates.messages.deleted'),
            color: "success"
          });
        } catch (error) {
          console.error('Failed to delete template:', error);
          addToast({
            title: t('messages.error'),
            description: t('templates.messages.deleteError'),
            color: "danger"
          });
        }
      },
    });
  }

  async function handleAddCurrency(currencyData: {
    code: string;
    name: string;
    symbol: string;
    symbol_position: 'left' | 'right';
    symbol_space: boolean;
  }) {
    try {
      await currenciesApi.create({
        ...currencyData,
        code: currencyData.code.trim(),
        name: currencyData.name.trim(),
        symbol: currencyData.symbol.trim(),
      });
      
      await loadCurrencies();
      
      setIsAddCurrencyModalOpen(false);
      setIsManageCurrenciesModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('currencies.messages.created'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create currency:', error);
      addToast({
        title: t('messages.error'),
        description: t('currencies.messages.createError'),
        color: "danger"
      });
      throw error;
    }
  }

  async function handleEditCurrency(currencyData: {
    code: string;
    name: string;
    symbol: string;
    symbol_position: 'left' | 'right';
    symbol_space: boolean;
  }) {
    if (!selectedCurrency) return;

    try {
      await currenciesApi.update(selectedCurrency.id, {
        ...currencyData,
        code: currencyData.code.trim(),
        name: currencyData.name.trim(),
        symbol: currencyData.symbol.trim(),
      });
      
      await loadCurrencies();
      
      setIsEditCurrencyModalOpen(false);
      setSelectedCurrency(null);
      setIsManageCurrenciesModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('currencies.messages.updated'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update currency:', error);
      addToast({
        title: t('messages.error'),
        description: t('currencies.messages.updateError'),
        color: "danger"
      });
      throw error;
    }
  }

  function handleDeleteCurrency(currencyId: string) {
    setConfirmModal({
      isOpen: true,
      title: t('currencies.deleteCurrency'),
      message: t('currencies.messages.confirmDelete'),
      action: async () => {
        try {
          await currenciesApi.delete(currencyId);
          
          await loadCurrencies();
          
          addToast({
            title: t('messages.success'),
            description: t('currencies.messages.deleted'),
            color: "success"
          });
        } catch (error) {
          console.error('Failed to delete currency:', error);
          addToast({
            title: t('messages.error'),
            description: t('currencies.messages.deleteError'),
            color: "danger"
          });
        }
      },
    });
  }

  async function loadCurrencies() {
    try {
      const currenciesData = await currenciesApi.getAll();
      setCurrencies(currenciesData);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  }

  async function loadClients() {
    try {
      const clientsData = await clientsApi.list();
      setAllClients(clientsData);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }

  async function handleAddClient(clientData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
    taxId: string;
    notes: string;
  }) {
    try {
      await clientsApi.create({
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        street: clientData.street || null,
        city: clientData.city || null,
        zip_code: clientData.zipCode || null,
        country: clientData.country || null,
        tax_id: clientData.taxId || null,
        notes: clientData.notes || null,
        company_id: companyId || null,
      });

      await loadClients();
      
      setIsAddClientModalOpen(false);
      setIsManageClientsModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('clients.messages.created'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to create client:', error);
      addToast({
        title: t('messages.error'),
        description: t('clients.messages.createError'),
        color: "danger"
      });
      throw error;
    }
  }

  async function handleEditClient(clientData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
    taxId: string;
    notes: string;
  }) {
    if (!selectedClient) return;

    try {
      await clientsApi.update(selectedClient.id, {
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        street: clientData.street || null,
        city: clientData.city || null,
        zip_code: clientData.zipCode || null,
        country: clientData.country || null,
        tax_id: clientData.taxId || null,
        notes: clientData.notes || null,
      });

      await loadClients();
      
      setIsEditClientModalOpen(false);
      setSelectedClient(null);
      setIsManageClientsModalOpen(true);
      
      addToast({
        title: t('messages.success'),
        description: t('clients.messages.updated'),
        color: "success"
      });
    } catch (error) {
      console.error('Failed to update client:', error);
      addToast({
        title: t('messages.error'),
        description: t('clients.messages.updateError'),
        color: "danger"
      });
      throw error;
    }
  }

  function handleDeleteClient(clientId: string) {
    setConfirmModal({
      isOpen: true,
      title: t('clients.deleteClient'),
      message: t('clients.messages.confirmDelete'),
      action: async () => {
        try {
          await clientsApi.delete(clientId);
          
          await loadClients();
          
          addToast({
            title: t('messages.success'),
            description: t('clients.messages.deleted'),
            color: "success"
          });
        } catch (error) {
          console.error('Failed to delete client:', error);
          addToast({
            title: t('messages.error'),
            description: t('clients.messages.deleteError'),
            color: "danger"
          });
        }
      },
    });
  }

  async function loadSettings() {
    try {
      const [companiesData, templatesData, currenciesData] = await Promise.all([
        companiesApi.getAll(),
        templatesApi.getAll(),
        currenciesApi.getAll(),
      ]);

      // Populate collections first so selectedKeys are always valid
      setCompanies(companiesData);
      setTemplates(templatesData);
      setCurrencies(currenciesData);

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
        setCompanyVatNumber(firstCompany.vat_number || '');
        setCompanyCocNumber(firstCompany.coc_number || '');
        setLogoUrl(firstCompany.logo_url || '');
        savedLogoUrlRef.current = firstCompany.logo_url || '';
        setTemplateId(firstCompany.template_id);
        setTerms(firstCompany.terms || '');
        setTax(firstCompany.tax_percent);
        setCurrencyId(firstCompany.currency_id);
        setLanguage(firstCompany.language || 'en');
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
        title: t('messages.error'),
        description: t('messages.noCompanySelected'),
        color: "danger"
      });
      return;
    }

    if (!templateId || !currencyId || tax === null) {
      setValidationErrors({
        template: !templateId,
        currency: !currencyId,
        tax: tax === null,
      });
      addToast({
        title: t('messages.error'),
        description: t('messages.requiredFieldsMissing'),
        color: "danger"
      });
      return;
    }

    setSaving(true);
    setValidationErrors({});
    try {
      // Upload pending logo file if any
      let finalLogoUrl = logoUrl;
      if (pendingLogoFile) {
        finalLogoUrl = await storageApi.uploadLogo(pendingLogoFile);
        setPendingLogoFile(null);
        setLogoUrl(finalLogoUrl);
      }

      // Delete old logo from storage if URL changed
      const oldUrl = savedLogoUrlRef.current;
      if (oldUrl && oldUrl !== finalLogoUrl && oldUrl.includes('/storage/')) {
        const oldPath = oldUrl.split('/logos/').pop();
        if (oldPath) {
          try { await storageApi.deleteLogo(oldPath); } catch { /* ignore */ }
        }
      }

      savedLogoUrlRef.current = finalLogoUrl || '';

      await companiesApi.update(companyId, {
        logo_url: finalLogoUrl || null,
        template_id: templateId,
        terms: terms || null,
        tax_percent: tax,
        currency_id: currencyId,
        language: language,
      });
      addToast({
        title: t('messages.settingsSaved'),
        description: t('messages.settingsSavedDescription'),
        color: "success"
      });
      setCooldown(6);
    } catch (error) {
      console.error('Failed to save settings:', error);
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
        <p className="text-slate-600">{t('loading')}</p>
      </div>
    );
  }

  const selectedCompanyObj = companies.find(c => c.id === companyId);

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        {/* Company context banner (inline) */}
        {selectedCompanyObj && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Building2 className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] leading-tight text-primary-600 dark:text-primary-400 font-medium">{t('companies.editingCompany')}</p>
              <p className="text-sm font-semibold text-foreground truncate">{selectedCompanyObj.name}</p>
            </div>
          </div>
        )}

        <div className="sm:ml-auto shrink-0">
          {hasPermission('settings:update') && (
          <Button
            color="primary"
            className="w-full ms:w-fit"
            onClick={handleSave}
            disabled={saving || cooldown > 0}
            startContent={<Save className="size-4" />}
          >
            {saving ? t('actions.saving') : cooldown > 0 ? `${t('actions.wait')} ${cooldown}s` : t('actions.save')}
          </Button>
          )}
        </div>
      </StickyHeader>

      {/* Two-column layout: settings left, company/client selector right (sticky) */}
      <div className="flex flex-col-reverse lg:flex-row gap-6 sm:gap-8">
        {/* Left column: main settings */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 sm:gap-8">
      {companyId && (
      <Card>
        <CardBody className='flex gap-6 sm:gap-8 p-4 sm:p-6'>
          <section className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">{t('logo.title')}</h2>
            <div className="space-y-4">
              <div>
                <span className="text-base font-semibold">
                  {t('logo.upload')}
                </span>
                <LogoUpload
                  logoUrl={logoUrl}
                  onLogoUrlChange={setLogoUrl}
                  onPendingFileChange={setPendingLogoFile}
                  imageError={imageError}
                  onImageError={setImageError}
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6 ">
            <h2 className="text-2xl font-bold">{t('invoiceSettings.title')}</h2>
            <div id="templates" ref={templatesRef} className="flex flex-col gap-2 scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-base font-semibold">
                  {t('invoiceSettings.templateStyle')}
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="w-full sm:w-auto"
                  startContent={<Edit className="size-4" />}
                  onClick={() => setIsManageTemplatesModalOpen(true)}
                  isDisabled={!hasPermission('templates:update')}
                >
                  {t('templates.manageTemplates')}
                </Button>
              </div>
              <Select
                label={t('invoiceSettings.templateDescription')}
                selectedKeys={templateId ? [String(templateId)] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) {
                    setTemplateId(String(selected));
                    setValidationErrors(prev => ({ ...prev, template: false }));
                  }
                }}
                labelPlacement="outside"
                isRequired
                isInvalid={!!validationErrors.template}
              >
                {templates.map((tmpl) => (
                  <SelectItem key={String(tmpl.id)}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div id="currencies" ref={currenciesRef} className="flex flex-col gap-2 scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-base font-semibold">
                  {t('invoiceSettings.defaultCurrency')}
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="w-full sm:w-auto"
                  startContent={<Edit className="size-4" />}
                  onClick={() => setIsManageCurrenciesModalOpen(true)}
                  isDisabled={!hasPermission('currencies:update')}
                >
                  {t('currencies.manageCurrencies')}
                </Button>
              </div>
              <Select
                label={t('invoiceSettings.currencyDescription')}
                selectedKeys={currencyId ? [String(currencyId)] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) {
                    setCurrencyId(String(selected));
                    setValidationErrors(prev => ({ ...prev, currency: false }));
                  }
                }}
                labelPlacement="outside"
                isRequired
                isInvalid={!!validationErrors.currency}
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
            <div className='flex flex-col gap-2'>
              <span className="text-base font-semibold">
                {t('invoiceSettings.defaultTax')}
              </span>
              <Input
                label={t('invoiceSettings.taxDescription')}
                labelPlacement="outside"
                type="number"
                value={tax !== null ? String(tax) : ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  setTax(val);
                  if (val !== null) setValidationErrors(prev => ({ ...prev, tax: false }));
                }}
                placeholder="0"
                min="0"
                step="0.01"
                isRequired
                isInvalid={!!validationErrors.tax}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <span className="text-base font-semibold">
                {t('invoiceSettings.defaultLanguage')}
              </span>
              <Select
                label={t('invoiceSettings.languageDescription')}
                selectedKeys={new Set([language])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  if (selected) setLanguage(String(selected));
                }}
                labelPlacement="outside"
                isRequired
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
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold">{t('terms.title')}</h2>
            <div>
              <span className="text-base font-semibold">
                {t('terms.label')}
              </span>
              <Textarea
                label={t('terms.description')}
                labelPlacement="outside"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t('terms.placeholder')}
                className="text-base"
              />
            </div>
          </section>
        </CardBody>
        <CardFooter className="p-4 sm:p-6">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>{t('terms.tip')}:</strong> {t('terms.tipText')}
            </p>
          </div>
        </CardFooter>
      </Card>
      )}

        </div>

        {/* Right column: company & client selectors (sticky) */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-28">
            <Card>
              <CardBody className="flex flex-col gap-6 p-4">
                <section id="companies" ref={companiesRef} className="flex flex-col gap-2 scroll-mt-20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {t('companies.selectCompany')}
                    </span>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onClick={() => setIsManageCompaniesModalOpen(true)}
                      isDisabled={!hasPermission('companies:update')}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                  </div>
                  <Select
                    label={t('companies.selectDescription')}
                    selectedKeys={companyId ? [String(companyId)] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected) handleCompanyChange(String(selected));
                    }}
                    placeholder={t('companies.selectPlaceholder')}
                    labelPlacement="outside"
                    size="sm"
                    isRequired
                  >
                    {companies.map((company) => (
                      <SelectItem key={String(company.id)} textValue={company.name}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </Select>
                </section>

                <div className="border-t border-divider" />

                <section id="clients" ref={clientsRef} className="flex flex-col gap-2 scroll-mt-20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {t('clients.title')}
                    </span>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onClick={() => setIsManageClientsModalOpen(true)}
                      isDisabled={!hasPermission('clients:update')}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-default-500">{t('clients.subtitle')}</p>
                </section>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>



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
          setCompanyVatNumber(company.vat_number || '');
          setCompanyCocNumber(company.coc_number || '');
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
          vatNumber: companyVatNumber,
          cocNumber: companyCocNumber,
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

      <ManageClientsModal
        isOpen={isManageClientsModalOpen}
        onClose={() => setIsManageClientsModalOpen(false)}
        clients={allClients}
        onEdit={(client) => {
          setSelectedClient(client);
          setIsManageClientsModalOpen(false);
          setIsEditClientModalOpen(true);
        }}
        onDelete={handleDeleteClient}
        onAdd={() => {
          setIsManageClientsModalOpen(false);
          setIsAddClientModalOpen(true);
        }}
      />

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setIsManageClientsModalOpen(true);
        }}
        onSave={handleAddClient}
      />

      <EditClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => {
          setIsEditClientModalOpen(false);
          setSelectedClient(null);
          setIsManageClientsModalOpen(true);
        }}
        onSave={handleEditClient}
        client={selectedClient}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          if (!confirmModal.action) return;
          setConfirmLoading(true);
          try {
            await confirmModal.action();
          } finally {
            setConfirmLoading(false);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmColor="danger"
        isLoading={confirmLoading}
      />


    </main>
  );
}
