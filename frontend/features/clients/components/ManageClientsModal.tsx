'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash, Plus } from 'lucide-react';
import type { Client } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onAdd: () => void;
}

export function ManageClientsModal({
  isOpen,
  onClose,
  clients,
  onEdit,
  onDelete,
  onAdd,
}: ManageClientsModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('clients.manageClients')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {clients.length === 0 ? (
              <p className="text-slate-600 text-center py-8">{t('clients.noData')}</p>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{client.name}</p>
                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      {client.email && <span>{client.email}</span>}
                      {client.phone && <span>• {client.phone}</span>}
                    </div>
                    {client.city && (
                      <p className="text-sm text-slate-500">
                        {[client.city, client.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {client.tax_id && (
                      <Chip size="sm" variant="flat" color="default" className="w-fit">
                        {t('clients.fields.taxId')}: {client.tax_id}
                      </Chip>
                    )}
                  </div>
                  <div className="flex md:flex-row flex-col gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<Edit className="size-4" />}
                      onClick={() => onEdit(client)}
                    >
                      {tCommon('actions.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash className="size-4" />}
                      onClick={() => onDelete(client.id)}
                    >
                      {tCommon('actions.delete')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.close')}
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="size-4" />}
            onClick={onAdd}
          >
            {t('clients.addClient')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
