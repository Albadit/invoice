'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash, Plus, Lock } from 'lucide-react';
import type { Currency } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageCurrenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: Currency[];
  onEdit: (currency: Currency) => void;
  onDelete: (currencyId: string) => void;
  onAdd: () => void;
}

export function ManageCurrenciesModal({
  isOpen,
  onClose,
  currencies,
  onEdit,
  onDelete,
  onAdd,
}: ManageCurrenciesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('currencies.manageCurrencies')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {currencies.length === 0 ? (
              <p className="text-slate-600 text-center py-8">{t('currencies.noData')}</p>
            ) : (
              currencies.map((currency) => {
                const isSystem = 'is_system' in currency && currency.is_system;
                return (
                <div
                  key={currency.id}
                  className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {currency.code} - {currency.name}
                        </p>
                        {isSystem && (
                          <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
                            {t('currencies.system')}
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Symbol: {currency.symbol_position === 'right' 
                          ? `100${currency.symbol_space ? ' ' : ''}${currency.symbol}` 
                          : `${currency.symbol}${currency.symbol_space ? ' ' : ''}100`}
                      </p>
                    </div>
                  </div>
                  <div className="flex md:flex-row flex-col gap-2">
                    {!isSystem && (
                      <>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Edit className="size-4" />}
                          onClick={() => onEdit(currency)}
                        >
                          {tCommon('actions.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          startContent={<Trash className="size-4" />}
                          onClick={() => onDelete(currency.id)}
                        >
                          {tCommon('actions.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                );
              })
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
            {t('currencies.addCurrency')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
