'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Select, SelectItem } from '@/components/ui';
import type { AdminUser, Role } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditUserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleId: string) => Promise<void>;
  user: AdminUser | null;
  roles: Role[];
  isSystemUser: boolean;
}

export function EditUserRoleModal({
  isOpen,
  onClose,
  onSave,
  user,
  roles,
  isSystemUser,
}: EditUserRoleModalProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setSelectedRoleId(user.role_id || '');
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await onSave(selectedRoleId);
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setSaving(false);
    }
  };

  const availableRoles = (isSystemUser ? roles : roles.filter(r => r.name !== 'Super Admin'))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>{t('editRole')}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500 mb-4">
            {t('editRoleFor')}: <strong>{user?.email}</strong>
          </p>
          <Select
            label={t('role')}
            selectedKeys={selectedRoleId ? [selectedRoleId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              if (selected) setSelectedRoleId(String(selected));
            }}
            isRequired
          >
            {availableRoles.map((role) => (
              <SelectItem key={role.id} textValue={role.name}>{role.name}</SelectItem>
            ))}
          </Select>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose} disabled={saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={!selectedRoleId}
          >
            {tCommon('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
