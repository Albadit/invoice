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

  useEffect(() => {
    if (isOpen && template) {
      setName(template.name);
      setStyling(template.styling || '');
    }
  }, [isOpen, template]);

  const handleSave = async () => {
    if (!name.trim()) {
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
              placeholder="Classic"
            />
            <Textarea
              label={t('templates.fields.styling')}
              value={styling}
              onChange={(e) => setStyling(e.target.value)}
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
          <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
