'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import type { Template } from '@/lib/types';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    styling: string;
  }) => Promise<void>;
  template: Template | null;
}

export function EditTemplateModal({ isOpen, onClose, onSave, template }: EditTemplateModalProps) {
  const [name, setName] = useState('');
  const [styling, setStyling] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      setName(template.name);
      setStyling(template.styling || '');
    }
  }, [isOpen, template]);

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
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Edit Template</ModalHeader>
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
          <Button variant="flat" onClick={onClose}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
