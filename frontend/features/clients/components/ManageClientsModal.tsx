'use client';

import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash } from 'lucide-react';
import type { Client } from '@/lib/types';
import { ManageModal } from '@/components/ui/ManageModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onAdd: () => void;
}

export function ManageClientsModal({ isOpen, onClose, clients, onEdit, onDelete, onAdd }: ManageClientsModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <ManageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('clients.manageClients')}
      items={clients}
      emptyMessage={t('clients.noData')}
      addLabel={t('clients.addClient')}
      onAdd={onAdd}
      keyExtractor={(client) => client.id}
      renderItem={(client) => (
        <div className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-divider rounded-lg hover:bg-default-100 transition-colors">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{client.name}</p>
            <div className="flex flex-wrap gap-2 text-sm text-default-500">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>• {client.phone}</span>}
            </div>
            {client.city && (
              <p className="text-sm text-default-400">{[client.city, client.country].filter(Boolean).join(', ')}</p>
            )}
            {client.tax_id && (
              <Chip size="sm" variant="flat" color="default" className="w-fit">
                {t('clients.fields.taxId')}: {client.tax_id}
              </Chip>
            )}
          </div>
          <div className="flex md:flex-row flex-col gap-2">
            <Button size="sm" variant="flat" color="primary" startContent={<Edit className="size-4" />} onClick={() => onEdit(client)}>{tCommon('actions.edit')}</Button>
            <Button size="sm" variant="flat" color="danger" startContent={<Trash className="size-4" />} onClick={() => onDelete(client.id)}>{tCommon('actions.delete')}</Button>
          </div>
        </div>
      )}
    />
  );
}
