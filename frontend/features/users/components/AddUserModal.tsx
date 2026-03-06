'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Role } from '@/lib/types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { email: string; password: string; roleId?: string }) => Promise<void>;
  roles: Role[];
  isSystemUser: boolean;
}

export function AddUserModal({ isOpen, onClose, onSave, roles, isSystemUser }: AddUserModalProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const availableRoles = isSystemUser ? roles : roles.filter(r => r.name !== 'Super Admin');

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setRoleId('');
    onClose();
  };

  const handleSave = async () => {
    if (!email.trim() || !password.trim()) return;
    setSaving(true);
    try {
      await onSave({
        email: email.trim(),
        password: password.trim(),
        roleId: roleId || undefined,
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
        <ModalHeader>{t('addUser')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('fields.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              placeholder={t('fields.emailPlaceholder')}
            />
            <Input
              label={t('fields.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
              placeholder={t('fields.passwordPlaceholder')}
            />
            <Select
              label={t('fields.role')}
              placeholder={t('fields.rolePlaceholder')}
              selectedKeys={roleId ? [roleId] : []}
              onSelectionChange={(keys) => setRoleId(Array.from(keys)[0] as string || '')}
            >
              {roles.map((role) => (
                <SelectItem key={role.id} textValue={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={handleClose} disabled={saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={!email.trim() || !password.trim()}
          >
            {tCommon('actions.create')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
