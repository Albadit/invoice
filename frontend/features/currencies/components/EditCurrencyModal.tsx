'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from '@/components/ui';
import { Switch } from "@heroui/switch";
import type { Currency } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currencyData: {
    code: string;
    name: string;
    symbol: string;
    symbol_position: 'left' | 'right';
    symbol_space: boolean;
    exchange_rate: number;
  }) => Promise<void>;
  currency: Currency | null;
}

export function EditCurrencyModal({ isOpen, onClose, onSave, currency }: EditCurrencyModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [symbolPosition, setSymbolPosition] = useState<'left' | 'right'>('left');
  const [symbolSpace, setSymbolSpace] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen && currency) {
      setCode(currency.code);
      setName(currency.name);
      setSymbol(currency.symbol);
      setSymbolPosition((currency.symbol_position as 'left' | 'right') || 'left');
      setSymbolSpace(currency.symbol_space || false);
      setExchangeRate(currency.exchange_rate ?? 1.0);
      setAttempted(false);
    }
  }, [isOpen, currency]);

  const handleSave = async () => {
    setAttempted(true);
    if (!code.trim() || !name.trim() || !symbol.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        code,
        name,
        symbol,
        symbol_position: symbolPosition,
        symbol_space: symbolSpace,
        exchange_rate: exchangeRate,
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
              isInvalid={attempted && !code.trim()}
              errorMessage={attempted && !code.trim() ? t('currencies.fields.codeRequired') : undefined}
              placeholder="USD"
              maxLength={3}
            />
            <Input
              label={t('currencies.fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              isInvalid={attempted && !name.trim()}
              errorMessage={attempted && !name.trim() ? t('currencies.fields.nameRequired') : undefined}
              placeholder="US Dollar"
            />
            <Input
              label={t('currencies.fields.symbol')}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              isRequired
              isInvalid={attempted && !symbol.trim()}
              errorMessage={attempted && !symbol.trim() ? t('currencies.fields.symbolRequired') : undefined}
              placeholder="$"
            />
            <Select
              label={t('currencies.fields.symbolPosition')}
              selectedKeys={new Set([symbolPosition])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected === 'left' || selected === 'right') setSymbolPosition(selected);
              }}
            >
              <SelectItem key="left">{t('currencies.fields.positionLeft')}</SelectItem>
              <SelectItem key="right">{t('currencies.fields.positionRight')}</SelectItem>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('currencies.fields.symbolSpace')}</span>
              <Switch
                isSelected={symbolSpace}
                onValueChange={setSymbolSpace}
                size="sm"
              />
            </div>
            <Input
              label={t('currencies.fields.exchangeRate')}
              type="number"
              value={String(exchangeRate)}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.00000001"
              description={t('currencies.fields.exchangeRateDescription')}
            />
            <div className="text-sm text-default-500">
              {t('currencies.fields.preview')}: <strong>{symbolPosition === 'left' ? `${symbol}${symbolSpace ? ' ' : ''}100.00` : `100.00${symbolSpace ? ' ' : ''}${symbol}`}</strong>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isDisabled={saving}
            isLoading={saving}
          >
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
