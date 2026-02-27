'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    styling: string;
  }) => Promise<void>;
}

export function AddTemplateModal({ isOpen, onClose, onSave }: AddTemplateModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setName('');
    setStyling('');
    onClose();
  };

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
      handleClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('templates.addTemplate')}</ModalHeader>
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
          <Button variant="flat" onClick={handleClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t('actions.creating') : t('templates.addTemplate')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
