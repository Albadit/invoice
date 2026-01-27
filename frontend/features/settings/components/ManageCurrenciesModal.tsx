'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Edit, Trash, Plus } from 'lucide-react';
import type { Currency } from '@/lib/types';

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
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Manage Currencies</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {currencies.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No currencies available</p>
            ) : (
              currencies.map((currency) => (
                <div
                  key={currency.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold">
                      {currency.code} - {currency.name}
                    </p>
                    <p className="text-sm text-slate-600">Symbol: {currency.symbol}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<Edit className="h-4 w-4" />}
                      onClick={() => onEdit(currency)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash className="h-4 w-4" />}
                      onClick={() => onDelete(currency.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onClick={onClose}>
            Close
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onClick={onAdd}
          >
            Add New
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
