'use client';

import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { Select, SelectItem } from '@heroui/select';
import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface TemplateEditorToolbarProps {
  editor: TemplateEditorState;
}

export function TemplateEditorToolbar({ editor }: TemplateEditorToolbarProps) {
  const {
    invoices,
    selectedId,
    editorDirty,
    wordWrap,
    setWordWrap,
    showPreview,
    setShowPreview,
    scaleMode,
    setScaleMode,
    handleSelectInvoice,
    handleDownload,
    handleResetStyling,
    setConfirmSaveOpen,
    setSaveModalOpen,
  } = editor;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-content1 border-b border-divider shrink-0">
      {/* Invoice select */}
      <Select
        aria-label="Invoice"
        size="sm"
        className="w-56"
        selectedKeys={selectedId ? new Set([selectedId]) : new Set()}
        onSelectionChange={(keys) => {
          const id = Array.from(keys)[0] as string;
          if (id) handleSelectInvoice(id);
        }}
      >
        {invoices.map((inv) => (
          <SelectItem key={inv.id} textValue={`${inv.invoice_code} - ${inv.customer_name}`}>
            {inv.invoice_code} - {inv.customer_name}
          </SelectItem>
        ))}
      </Select>

      <div className="w-px h-5 bg-default-300" />

      {/* Download */}
      <Button
        color="primary"
        size="sm"
        onPress={handleDownload}
      >
        Download PDF
      </Button>

      {/* Reset / Save / Save As New */}
      {editorDirty && (
        <>
          <Button
            size="sm"
            variant="flat"
            onPress={handleResetStyling}
          >
            Reset
          </Button>
          <Button
            size="sm"
            color="success"
            variant="flat"
            onPress={() => setConfirmSaveOpen(true)}
          >
            Save
          </Button>
          <Button
            size="sm"
            color="secondary"
            variant="flat"
            onPress={() => setSaveModalOpen(true)}
          >
            Save As New
          </Button>
        </>
      )}

      <div className="flex-1" />

      {/* Word Wrap toggle */}
      <Switch
        size="sm"
        isSelected={wordWrap}
        onValueChange={setWordWrap}
      >
        <span className="text-xs text-default-500">Wrap</span>
      </Switch>

      <div className="w-px h-5 bg-default-300" />

      {/* Preview toggle */}
      <Button
        size="sm"
        variant={showPreview ? 'flat' : 'light'}
        color={showPreview ? 'primary' : 'default'}
        onPress={() => setShowPreview(p => !p)}
        startContent={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showPreview ? (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
        }
      >
        Preview
      </Button>

      {/* Scale select (only when preview is on) */}
      {showPreview && (
        <>
          <div className="w-px h-5 bg-default-300" />
          <Select
            aria-label="Scale"
            size="sm"
            className="w-28"
            selectedKeys={new Set([scaleMode])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              if (val) setScaleMode(val);
            }}
          >
            <SelectItem key="auto">Auto</SelectItem>
            <SelectItem key="25">25%</SelectItem>
            <SelectItem key="50">50%</SelectItem>
            <SelectItem key="75">75%</SelectItem>
            <SelectItem key="100">100%</SelectItem>
          </Select>
        </>
      )}
    </div>
  );
}
