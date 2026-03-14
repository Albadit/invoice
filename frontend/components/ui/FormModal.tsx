'use client';

import { type ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { useTranslation } from '@/contexts/LocaleProvider';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
  saveDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export function FormModal({ isOpen, onClose, title, children, onSave, saving, saveLabel, saveDisabled, size = '2xl' }: FormModalProps) {
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            {children}
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose} isDisabled={saving}>{tCommon('actions.cancel')}</Button>
          <Button color="primary" onClick={onSave} isLoading={saving} isDisabled={saving || saveDisabled}>{saveLabel || tCommon('actions.save')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
