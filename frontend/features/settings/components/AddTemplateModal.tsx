'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    styling: string;
  }) => Promise<void>;
}

export function AddTemplateModal({ isOpen, onClose, onSave }: AddTemplateModalProps) {
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setName('');
    setStyling('');
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        styling,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Add New Template</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              placeholder="Classic"
            />
            <Textarea
              label="Template Styling (HTML)"
              value={styling}
              onChange={(e) => setStyling(e.target.value)}
              placeholder="Enter HTML template..."
              minRows={15}
              className="font-mono text-sm"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Create Template'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
