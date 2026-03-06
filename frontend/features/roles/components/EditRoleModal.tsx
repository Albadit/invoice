'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import type { Role } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  role: Role | null;
}

export function EditRoleModal({ isOpen, onClose, onSave, role }: EditRoleModalProps) {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen && role) {
      setName(role.name);
      setDescription(role.description || '');
      setAttempted(false);
    }
  }, [isOpen, role]);

  const handleSave = async () => {
    setAttempted(true);
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>{t('editRole')}</ModalHeader>
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
          <Button variant="flat" onClick={onClose} isDisabled={saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={saving}
          >
            {tCommon('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
