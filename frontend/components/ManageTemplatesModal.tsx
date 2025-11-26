'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Edit, Trash, Plus } from 'lucide-react';
import type { Template } from '@/lib/types';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onAdd: () => void;
}

export function ManageTemplatesModal({
  isOpen,
  onClose,
  templates,
  onEdit,
  onDelete,
  onAdd,
}: ManageTemplatesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Manage Templates</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {templates.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No templates available</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold">{template.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<Edit className="h-4 w-4" />}
                      onClick={() => onEdit(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash className="h-4 w-4" />}
                      onClick={() => onDelete(template.id)}
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
