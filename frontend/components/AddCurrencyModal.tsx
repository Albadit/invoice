'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

interface AddCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currencyData: {
    code: string;
    name: string;
    symbol: string;
  }) => Promise<void>;
}

export function AddCurrencyModal({ isOpen, onClose, onSave }: AddCurrencyModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setCode('');
    setName('');
    setSymbol('');
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
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save currency:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader>Add New Currency</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Currency Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              isRequired
              placeholder="USD"
              maxLength={3}
            />
            <Input
              label="Currency Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              placeholder="US Dollar"
            />
            <Input
              label="Currency Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              isRequired
              placeholder="$"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            disabled={saving || !code.trim() || !name.trim() || !symbol.trim()}
          >
            {saving ? 'Creating...' : 'Create Currency'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
