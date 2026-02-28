'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { templatesApi } from '@/features/templates/api';
import { DEFAULT_TEMPLATE_STYLING } from '@/features/invoice/utils/templateEngine';
import type { InvoiceWithItems, Template } from '@/lib/types';

/**
 * Custom hook encapsulating all state and logic for the template editor page.
 */
export function useTemplateEditor() {
  // ── Core data ────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Template state ───────────────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [styling, setStyling] = useState<string>('');
  const [editorDirty, setEditorDirty] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────
  const [wordWrap, setWordWrap] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50);
  const [previewScale, setPreviewScale] = useState(1);
  const [scaleMode, setScaleMode] = useState<string>('auto');

  // ── Refs ──────────────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
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
        const [invoiceRes, tplList] = await Promise.all([
          invoicesApi.getAll({ limit: 50 }),
          templatesApi.getAll(),
        ]);
        setInvoices(invoiceRes.data);
        setTemplates(tplList);

        if (invoiceRes.data.length > 0) {
          const first = invoiceRes.data[0];
          setSelectedId(first.id);
          const tpl = tplList.find(t => t.id === first.template_id);
          setStyling(tpl?.styling ?? DEFAULT_TEMPLATE_STYLING);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Preview rendering ────────────────────────────────────────────

  const renderPreview = useCallback(async (invoiceId: string, tplStyling: string) => {
    if (!showPreview) return;
    try {
      const res = await fetch('/invoice/test/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, styling: tplStyling || undefined }),
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
    if (selectedId) renderPreview(selectedId, styling);
  }, [selectedId, styling, renderPreview]);

  useEffect(() => {
    if (showPreview && selectedId) {
      renderPreview(selectedId, styling);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);

  // ── A4 scale logic ───────────────────────────────────────────────

  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  const updatePreviewScale = useCallback(() => {
    if (!showPreview) return;
    if (scaleMode !== 'auto') {
      setPreviewScale(parseInt(scaleMode, 10) / 100);
      return;
    }
    const container = previewContainerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const scaleX = (clientWidth - 32) / A4_WIDTH_PX;
    const scaleY = (clientHeight - 32) / A4_HEIGHT_PX;
    setPreviewScale(Math.min(scaleX, scaleY, 1));
  }, [scaleMode, showPreview]);

  useEffect(() => {
    updatePreviewScale();
    const obs = new ResizeObserver(updatePreviewScale);
    if (previewContainerRef.current) obs.observe(previewContainerRef.current);
    return () => obs.disconnect();
  }, [updatePreviewScale]);

  useEffect(() => {
    const id = requestAnimationFrame(updatePreviewScale);
    return () => cancelAnimationFrame(id);
  }, [editorWidth, scaleMode, showPreview, updatePreviewScale]);

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

  function handleSelectInvoice(id: string) {
    setSelectedId(id);
    const inv = invoices.find(i => i.id === id);
    const tpl = templates.find(t => t.id === inv?.template_id);
    setStyling(tpl?.styling ?? DEFAULT_TEMPLATE_STYLING);
    setEditorDirty(false);
  }

  function handleStylingChange(value: string) {
    setStyling(value);
    setEditorDirty(true);
  }

  function handleResetStyling() {
    const inv = invoices.find(i => i.id === selectedId);
    const tpl = templates.find(t => t.id === inv?.template_id);
    setStyling(tpl?.styling ?? DEFAULT_TEMPLATE_STYLING);
    setEditorDirty(false);
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/invoice/${selectedId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styling }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'invoice.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }

  async function handleSaveTemplate() {
    setSavingExisting(true);
    const inv = invoices.find(i => i.id === selectedId);
    if (!inv?.template_id) { setSavingExisting(false); return; }
    try {
      await templatesApi.update(inv.template_id, { styling });
      setTemplates(prev => prev.map(t =>
        t.id === inv.template_id ? { ...t, styling } : t
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
    invoices,
    selectedId,
    loading,
    error,
    templates,
    styling,
    editorDirty,

    // UI state
    wordWrap,
    setWordWrap,
    showPreview,
    setShowPreview,
    editorWidth,
    previewScale,
    scaleMode,
    setScaleMode,

    // Refs
    iframeRef,
    previewContainerRef,
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
    handleSelectInvoice,
    handleStylingChange,
    handleResetStyling,
    handleDownload,
    handleSaveTemplate,
    handleSaveAsNewTemplate,
    handleMouseDown,
    handleEditorScroll,
  };
}

export type TemplateEditorState = ReturnType<typeof useTemplateEditor>;
