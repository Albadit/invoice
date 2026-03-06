'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
}

export function AddRoleModal({ isOpen, onClose, onSave }: AddRoleModalProps) {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const handleClose = () => {
    setName('');
    setDescription('');
    setAttempted(false);
    onClose();
  };

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      handleClose();
    } catch {
      // error handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader>{t('addRole')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              isInvalid={attempted && !name.trim()}
              errorMessage={attempted && !name.trim() ? t('fields.nameRequired') : undefined}
              placeholder={t('fields.namePlaceholder')}
            />
            <Textarea
              label={t('fields.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.descriptionPlaceholder')}
              minRows={2}
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={handleClose} isDisabled={saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={saving}
          >
            {tCommon('actions.create')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
