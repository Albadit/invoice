'use client';

import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash, Lock } from 'lucide-react';
import type { Currency } from '@/lib/types';
import { ManageModal } from '@/components/ui/ManageModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageCurrenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: Currency[];
  onEdit: (currency: Currency) => void;
  onDelete: (currencyId: string) => void;
  onAdd: () => void;
}

export function ManageCurrenciesModal({ isOpen, onClose, currencies, onEdit, onDelete, onAdd }: ManageCurrenciesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <ManageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('currencies.manageCurrencies')}
      items={currencies}
      emptyMessage={t('currencies.noData')}
      addLabel={t('currencies.addCurrency')}
      onAdd={onAdd}
      keyExtractor={(currency) => currency.id}
      renderItem={(currency) => {
        const isSystem = 'is_system' in currency && currency.is_system;
        return (
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-divider rounded-lg hover:bg-default-100 transition-colors">
            <div className="flex flex-col items-start gap-2">
              <div className="w-full flex justify-between items-center gap-2">
                <p className="font-semibold">{currency.code} - {currency.name}</p>
              </div>
              <p className="text-sm text-default-500">
                Symbol: {currency.symbol_position === 'right' ? `100${currency.symbol_space ? ' ' : ''}${currency.symbol}` : `${currency.symbol}${currency.symbol_space ? ' ' : ''}100`}
              </p>
            </div>
            {isSystem && (
              <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>{t('currencies.system')}</Chip>
            )}
            {!isSystem && (
              <div className="flex md:flex-row flex-col gap-2">
                <Button size="sm" variant="flat" color="primary" startContent={<Edit className="size-4" />} onClick={() => onEdit(currency)}>{tCommon('actions.edit')}</Button>
                <Button size="sm" variant="flat" color="danger" startContent={<Trash className="size-4" />} onClick={() => onDelete(currency.id)}>{tCommon('actions.delete')}</Button>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
