'use client';

import { useState } from 'react';
import { Input, Textarea } from "@heroui/input";
import { FormModal } from '@/components/ui/FormModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: { name: string; styling: string }) => Promise<void>;
}

export function AddTemplateModal({ isOpen, onClose, onSave }: AddTemplateModalProps) {
  const { t } = useTranslation('settings');
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const handleClose = () => { setName(''); setStyling(''); setAttempted(false); onClose(); };

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim() || !styling.trim()) return;
    setSaving(true);
    try { await onSave({ name, styling }); handleClose(); }
    catch (error) { console.error('Failed to save template:', error); }
    finally { setSaving(false); }
  };

  return (
    <FormModal isOpen={isOpen} onClose={handleClose} title={t('templates.addTemplate')} onSave={handleSave} saving={saving} saveLabel={saving ? t('actions.creating') : t('templates.addTemplate')} size="3xl">
      <Input label={t('templates.fields.name')} value={name} onChange={(e) => setName(e.target.value)} isRequired isInvalid={attempted && !name.trim()} errorMessage={attempted && !name.trim() ? t('templates.fields.nameRequired') : undefined} placeholder="Classic" />
      <Textarea label={t('templates.fields.styling')} value={styling} onChange={(e) => setStyling(e.target.value)} isRequired isInvalid={attempted && !styling.trim()} errorMessage={attempted && !styling.trim() ? t('templates.fields.stylingRequired') : undefined} placeholder="Enter HTML template..." minRows={15} className="font-mono text-sm" />
    </FormModal>
  );
}
