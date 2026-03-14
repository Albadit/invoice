'use client';

import { useState, useEffect } from 'react';
import { Input, Textarea } from "@heroui/input";
import type { Template } from '@/lib/types';
import { FormModal } from '@/components/ui/FormModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: { name: string; styling: string }) => Promise<void>;
  template: Template | null;
}

export function EditTemplateModal({ isOpen, onClose, onSave, template }: EditTemplateModalProps) {
  const { t } = useTranslation('settings');
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen && template) { setName(template.name); setStyling(template.styling || ''); setAttempted(false); }
  }, [isOpen, template]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim() || !styling.trim()) return;
    setSaving(true);
    try { await onSave({ name, styling }); onClose(); }
    catch (error) { console.error('Failed to save template:', error); }
    finally { setSaving(false); }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={t('templates.editTemplate')} onSave={handleSave} saving={saving} saveLabel={saving ? t('actions.saving') : t('actions.save')} size="3xl">
      <Input label={t('templates.fields.name')} value={name} onChange={(e) => setName(e.target.value)} isRequired isInvalid={attempted && !name.trim()} errorMessage={attempted && !name.trim() ? t('templates.fields.nameRequired') : undefined} placeholder="Classic" />
      <Textarea label={t('templates.fields.styling')} value={styling} onChange={(e) => setStyling(e.target.value)} isRequired isInvalid={attempted && !styling.trim()} errorMessage={attempted && !styling.trim() ? t('templates.fields.stylingRequired') : undefined} placeholder="Enter HTML template..." minRows={15} className="font-mono text-sm" />
    </FormModal>
  );
}
