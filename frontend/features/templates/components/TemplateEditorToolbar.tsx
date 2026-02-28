'use client';

import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { Select, SelectItem } from '@heroui/select';
import { Chip } from '@heroui/chip';
import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface TemplateEditorToolbarProps {
  editor: TemplateEditorState;
}

export function TemplateEditorToolbar({ editor }: TemplateEditorToolbarProps) {
  const {
    companies,
    selectedCompanyId,
    languageConfig,
    previewLanguage,
    templates,
    selectedTemplateId,
    isSystemTemplate,
    editorDirty,
    wordWrap,
    setWordWrap,
    showPreview,
    setShowPreview,
    handleSelectCompany,
    handleSelectLanguage,
    handleSelectTemplate,
    handleDownload,
    handleResetStyling,
    setConfirmSaveOpen,
    setSaveModalOpen,
  } = editor;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-content1 border-b border-divider shrink-0 flex-wrap">
      {/* Template select */}
      <Select
        aria-label="Template"
        size="sm"
        className="w-56"
        selectedKeys={selectedTemplateId ? new Set([selectedTemplateId]) : new Set()}
        onSelectionChange={(keys) => {
          const id = Array.from(keys)[0] as string;
          if (id) handleSelectTemplate(id);
        }}
      >
        {templates.map((tpl) => (
          <SelectItem key={tpl.id} textValue={`${tpl.name}${tpl.is_system ? ' (System)' : ''}`}>
            <div className="flex items-center gap-2">
              <span>{tpl.name}</span>
              {tpl.is_system && (
                <Chip size="sm" variant="flat" color="warning" className="h-5 text-[10px]">System</Chip>
              )}
            </div>
          </SelectItem>
        ))}
      </Select>

      {/* Company select (for preview data) — clearable */}
      <Select
        aria-label="Company"
        size="sm"
        className="w-56"
        placeholder="Dummy Company"
        selectedKeys={selectedCompanyId ? new Set([selectedCompanyId]) : new Set()}
        onSelectionChange={(keys) => {
          const arr = Array.from(keys);
          handleSelectCompany(arr.length > 0 ? (arr[0] as string) : '');
        }}
      >
        {companies.map((company) => (
          <SelectItem key={company.id} textValue={company.name}>
            {company.name}
          </SelectItem>
        ))}
      </Select>

      {/* Language select */}
      <Select
        aria-label="Language"
        size="sm"
        className="w-40"
        selectedKeys={new Set([previewLanguage])}
        onSelectionChange={(keys) => {
          const val = Array.from(keys)[0] as string;
          if (val) handleSelectLanguage(val);
        }}
      >
        {languageConfig.map((lang) => (
          <SelectItem key={lang.key} textValue={lang.name}>
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lang.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
              {lang.name}
            </span>
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
          {!isSystemTemplate && (
            <Button
              size="sm"
              color="success"
              variant="flat"
              onPress={() => setConfirmSaveOpen(true)}
            >
              Save
            </Button>
          )}
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

      {/* System template notice */}
      {isSystemTemplate && editorDirty && (
        <Chip size="sm" variant="flat" color="warning" className="text-[11px]">
          System template – use &quot;Save As New&quot;
        </Chip>
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
    </div>
  );
}
