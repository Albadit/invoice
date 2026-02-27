'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currencyData: {
    code: string;
    name: string;
    symbol: string;
    symbol_position: 'left' | 'right';
    symbol_space: boolean;
  }) => Promise<void>;
}

export function AddCurrencyModal({ isOpen, onClose, onSave }: AddCurrencyModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [symbolPosition, setSymbolPosition] = useState<'left' | 'right'>('left');
  const [symbolSpace, setSymbolSpace] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setCode('');
    setName('');
    setSymbol('');
    setSymbolPosition('left');
    setSymbolSpace(false);
    onClose();
  };

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
        symbol_position: symbolPosition,
        symbol_space: symbolSpace,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save currency:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('currencies.addCurrency')}</ModalHeader>
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
            <Select
              label={t('currencies.fields.symbolPosition')}
              selectedKeys={[symbolPosition]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value === 'left' || value === 'right') setSymbolPosition(value);
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
            <div className="text-sm text-default-500">
              {t('currencies.fields.preview')}: <strong>{symbolPosition === 'left' ? `${symbol}${symbolSpace ? ' ' : ''}100.00` : `100.00${symbolSpace ? ' ' : ''}${symbol}`}</strong>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={handleClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            disabled={saving || !code.trim() || !name.trim() || !symbol.trim()}
          >
            {saving ? t('actions.creating') : t('currencies.addCurrency')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
