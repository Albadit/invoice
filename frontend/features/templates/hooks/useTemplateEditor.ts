'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { companiesApi } from '@/features/companies/api';
import { currenciesApi } from '@/features/currencies/api';
import { templatesApi } from '@/features/templates/api';
import { DEFAULT_TEMPLATE_STYLING } from '@/features/invoice/utils/templateEngine';
import { DUMMY_INVOICE } from '@/features/templates/data/dummyInvoice';
import { useLocale } from '@/contexts/LocaleProvider';
import type { Template, Company, Currency, InvoiceWithItems } from '@/lib/types';

/**
 * Custom hook encapsulating all state and logic for the template editor page.
 */
export function useTemplateEditor() {
  // ── Core data ────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { languageConfig } = useLocale();
  const [previewLanguage, setPreviewLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Template state ───────────────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [styling, setStyling] = useState<string>('');
  const [editorDirty, setEditorDirty] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────
  const [wordWrap, setWordWrap] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editorWidth, setEditorWidth] = useState(65);
  const [previewScale, setPreviewScale] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // ── Save state ───────────────────────────────────────────────────
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [savingExisting, setSavingExisting] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const [companyList, currencyList, tplList] = await Promise.all([
          companiesApi.getAll(),
          currenciesApi.getAll(),
          templatesApi.getAll(),
        ]);
        setCompanies(companyList);
        setCurrencies(currencyList);
        setTemplates(tplList);

        // Auto-select first template
        if (tplList.length > 0) {
          setSelectedTemplateId(tplList[0].id);
          setStyling(tplList[0].styling ?? DEFAULT_TEMPLATE_STYLING);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Build preview invoice (dummy + selected company data) ────────

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedCurrency = currencies.find(
    c => c.id === (selectedCompany?.currency_id ?? '')
  ) ?? DUMMY_INVOICE.currency;

  const previewInvoice: InvoiceWithItems = {
    ...DUMMY_INVOICE,
    company_id: selectedCompany?.id ?? DUMMY_INVOICE.company_id,
    currency_id: selectedCurrency.id,
    company: selectedCompany
      ? { ...selectedCompany }
      : DUMMY_INVOICE.company,
    currency: selectedCurrency,
    language: previewLanguage,
  };

  // ── Preview rendering ────────────────────────────────────────────

  const renderPreview = useCallback(async (invoice: InvoiceWithItems, tplStyling: string) => {
    if (!showPreview) return;
    try {
      const res = await fetch('/editor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice, styling: tplStyling || undefined }),
      });
      const html = await res.text();
      const iframe = iframeRef.current;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) { doc.open(); doc.write(html); doc.close(); }
      }
    } catch (err) {
      console.error('Preview render failed:', err);
    }
  }, [showPreview]);

  useEffect(() => {
    renderPreview(previewInvoice, styling);
  }, [selectedCompanyId, previewLanguage, styling, renderPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showPreview) {
      renderPreview(previewInvoice, styling);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  // ── A4 scale logic ───────────────────────────────────────────────

  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  const updatePreviewScale = useCallback(() => {
    if (!showPreview) return;
    const container = previewContainerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const scaleX = (clientWidth - 32) / A4_WIDTH_PX;
    const scaleY = (clientHeight - 32) / A4_HEIGHT_PX;
    setPreviewScale(Math.min(scaleX, scaleY));
  }, [showPreview]);

  useEffect(() => {
    // Skip while loading — the preview container isn't mounted yet
    if (loading) return;

    const container = previewContainerRef.current;
    if (!container) return;

    // Initial calculation (may need a frame for layout to settle)
    requestAnimationFrame(updatePreviewScale);

    const obs = new ResizeObserver(updatePreviewScale);
    obs.observe(container);
    return () => obs.disconnect();
  }, [loading, updatePreviewScale]);

  useEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(updatePreviewScale);
    return () => cancelAnimationFrame(id);
  }, [loading, editorWidth, showPreview, previewFullscreen, updatePreviewScale]);

  // ── Fullscreen logic ─────────────────────────────────────────────

  function handleToggleFullscreen() {
    const el = previewPanelRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setPreviewFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setPreviewFullscreen(false)).catch(() => {});
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setPreviewFullscreen(!!document.fullscreenElement);
      // Recalculate scale after fullscreen transition
      requestAnimationFrame(updatePreviewScale);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [updatePreviewScale]);

  // ── Drag handler ─────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = editorWidth;
    const parent = (e.target as HTMLElement).parentElement;
    if (!parent) return;
    const parentWidth = parent.getBoundingClientRect().width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = ev.clientX - startX;
      const newPct = startWidth + (delta / parentWidth) * 100;
      setEditorWidth(Math.max(20, Math.min(80, newPct)));
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [editorWidth]);

  // ── Editor scroll sync ──────────────────────────────────────────

  const handleEditorScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────

  function handleSelectCompany(companyId: string) {
    setSelectedCompanyId(companyId);
  }

  function handleSelectLanguage(lang: string) {
    setPreviewLanguage(lang);
  }

  function handleSelectTemplate(templateId: string) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setStyling(tpl.styling ?? DEFAULT_TEMPLATE_STYLING);
    setEditorDirty(false);
  }

  function handleStylingChange(value: string) {
    setStyling(value);
    setEditorDirty(true);
  }

  function handleResetStyling() {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    setStyling(tpl?.styling ?? DEFAULT_TEMPLATE_STYLING);
    setEditorDirty(false);
  }

  async function handleDownload() {
    try {
      const res = await fetch('/editor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: previewInvoice, styling, pdf: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-preview-${previewInvoice.invoice_code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const isSystemTemplate = selectedTemplate?.is_system ?? false;

  async function handleSaveTemplate() {
    if (!selectedTemplateId || isSystemTemplate) { setSavingExisting(false); return; }
    setSavingExisting(true);
    try {
      await templatesApi.update(selectedTemplateId, { styling });
      setTemplates(prev => prev.map(t =>
        t.id === selectedTemplateId ? { ...t, styling } : t
      ));
      setEditorDirty(false);
    } catch (err) {
      console.error('Save template failed:', err);
    } finally {
      setSavingExisting(false);
      setConfirmSaveOpen(false);
    }
  }

  async function handleSaveAsNewTemplate() {
    if (!saveTemplateName.trim()) return;
    setSaving(true);
    try {
      const newTpl = await templatesApi.create({
        name: saveTemplateName.trim(),
        styling,
      });
      setTemplates(prev => [...prev, newTpl]);
      setSaveTemplateName('');
      setSaveModalOpen(false);
      setEditorDirty(false);
    } catch (err) {
      console.error('Save as new template failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return {
    // Data
    companies,
    selectedCompanyId,
    languageConfig,
    previewLanguage,
    loading,
    error,
    templates,
    selectedTemplateId,
    isSystemTemplate,
    styling,
    editorDirty,

    // UI state
    wordWrap,
    setWordWrap,
    showPreview,
    setShowPreview,
    editorWidth,
    previewScale,
    previewFullscreen,

    // Refs
    iframeRef,
    previewContainerRef,
    previewPanelRef,
    textareaRef,
    gutterRef,

    // Save state
    saveModalOpen,
    setSaveModalOpen,
    saveTemplateName,
    setSaveTemplateName,
    saving,
    confirmSaveOpen,
    setConfirmSaveOpen,
    savingExisting,

    // Handlers
    handleSelectCompany,
    handleSelectLanguage,
    handleSelectTemplate,
    handleStylingChange,
    handleResetStyling,
    handleDownload,
    handleSaveTemplate,
    handleSaveAsNewTemplate,
    handleMouseDown,
    handleEditorScroll,
    handleToggleFullscreen,
  };
}

export type TemplateEditorState = ReturnType<typeof useTemplateEditor>;
