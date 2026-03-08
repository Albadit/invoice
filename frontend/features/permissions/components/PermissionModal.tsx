'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Permission } from '@/lib/types';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { key: string; description: string | null; route: string | null }) => Promise<void>;
  permission?: Permission | null;
}

export function PermissionModal({ isOpen, onClose, onSave, permission }: PermissionModalProps) {
  const { t } = useTranslation('permissions');
  const { t: tCommon } = useTranslation('common');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [route, setRoute] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const isEdit = !!permission;

  useEffect(() => {
    if (isOpen && permission) {
      setKey(permission.key);
      setDescription(permission.description || '');
      setRoute(permission.route || '');
    } else if (isOpen) {
      setKey('');
      setDescription('');
      setRoute('');
    }
    setAttempted(false);
  }, [isOpen, permission]);

  const handleClose = () => {
    setKey('');
    setDescription('');
    setRoute('');
    setAttempted(false);
    onClose();
  };

  const handleSave = async () => {
    setAttempted(true);
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSave({
        key: key.trim(),
        description: description.trim() || null,
        route: route.trim() || null,
      });
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
        <ModalHeader>{isEdit ? t('editPermission') : t('addPermission')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('fields.key')}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              isRequired
              isInvalid={attempted && !key.trim()}
              errorMessage={attempted && !key.trim() ? t('fields.keyRequired') : undefined}
              placeholder={t('fields.keyPlaceholder')}
              description={t('fields.keyDescription')}
            />
            <Textarea
              label={t('fields.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.descriptionPlaceholder')}
              minRows={2}
            />
            <Input
              label={t('fields.route')}
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder={t('fields.routePlaceholder')}
              description={t('fields.routeDescription')}
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
            {isEdit ? tCommon('actions.save') : tCommon('actions.create')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
