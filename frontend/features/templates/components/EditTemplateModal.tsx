'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import type { Template } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    styling: string;
  }) => Promise<void>;
  template: Template | null;
}

export function EditTemplateModal({ isOpen, onClose, onSave, template }: EditTemplateModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      setName(template.name);
      setStyling(template.styling || '');
      setAttempted(false);
    }
  }, [isOpen, template]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim() || !styling.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        styling,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('templates.editTemplate')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('templates.fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              isInvalid={attempted && !name.trim()}
              errorMessage={attempted && !name.trim() ? t('templates.fields.nameRequired') : undefined}
              placeholder="Classic"
            />
            <Textarea
              label={t('templates.fields.styling')}
              value={styling}
              onChange={(e) => setStyling(e.target.value)}
              isRequired
              isInvalid={attempted && !styling.trim()}
              errorMessage={attempted && !styling.trim() ? t('templates.fields.stylingRequired') : undefined}
              placeholder="Enter HTML template..."
              minRows={15}
              className="font-mono text-sm"
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button color="primary" onClick={handleSave} isDisabled={saving} isLoading={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
