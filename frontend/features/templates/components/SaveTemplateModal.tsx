'use client';

import { Button } from '@heroui/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Input } from '@heroui/input';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { TemplateEditorState } from '../hooks/useTemplateEditor';

interface SaveTemplateModalProps {
  editor: TemplateEditorState;
}

export function SaveTemplateModal({ editor }: SaveTemplateModalProps) {
  const {
    saveModalOpen,
    setSaveModalOpen,
    saveTemplateName,
    setSaveTemplateName,
    saving,
    confirmSaveOpen,
    setConfirmSaveOpen,
    savingExisting,
    handleSaveTemplate,
    handleSaveAsNewTemplate,
  } = editor;

  return (
    <>
      {/* Save As New Template Modal */}
      <Modal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} size="sm">
        <ModalContent>
          <ModalHeader>Save As New Template</ModalHeader>
          <ModalBody>
            <Input
              label="Template Name"
              placeholder="e.g. Modern Invoice"
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              isRequired
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setSaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={!saveTemplateName.trim()}
              isLoading={saving}
              onPress={handleSaveAsNewTemplate}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        onConfirm={handleSaveTemplate}
        title="Save Template"
        message="Are you sure you want to overwrite the existing template with your changes?"
        confirmLabel="Save"
        confirmColor="success"
        isLoading={savingExisting}
      />
    </>
  );
}
