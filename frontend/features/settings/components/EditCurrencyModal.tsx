'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import type { Currency } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currencyData: {
    code: string;
    name: string;
    symbol: string;
  }) => Promise<void>;
  currency: Currency | null;
}

export function EditCurrencyModal({ isOpen, onClose, onSave, currency }: EditCurrencyModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && currency) {
      setCode(currency.code);
      setName(currency.name);
      setSymbol(currency.symbol);
    }
  }, [isOpen, currency]);

  const handleSave = async () => {
    if (!code.trim() || !name.trim() || !symbol.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        code,
        name,
        symbol,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save currency:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('currencies.editCurrency')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('currencies.fields.code')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              isRequired
              placeholder="USD"
              maxLength={3}
            />
            <Input
              label={t('currencies.fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              placeholder="US Dollar"
            />
            <Input
              label={t('currencies.fields.symbol')}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              isRequired
              placeholder="$"
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            disabled={saving || !code.trim() || !name.trim() || !symbol.trim()}
          >
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
