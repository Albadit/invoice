'use client';

import { type ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Plus } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleProvider';

export interface ManageModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  emptyMessage: string;
  addLabel: string;
  onAdd: () => void;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

export function ManageModal<T>({ isOpen, onClose, title, items, emptyMessage, addLabel, onAdd, renderItem, keyExtractor }: ManageModalProps<T>) {
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {items.length === 0 ? (
              <p className="text-slate-600 text-center py-8">{emptyMessage}</p>
            ) : (
              items.map((item) => (
                <div key={keyExtractor(item)}>{renderItem(item)}</div>
              ))
            )}
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>{tCommon('actions.close')}</Button>
          <Button color="primary" startContent={<Plus className="size-4" />} onClick={onAdd}>{addLabel}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
