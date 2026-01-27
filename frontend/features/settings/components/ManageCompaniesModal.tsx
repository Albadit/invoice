'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Edit, Trash, Plus } from 'lucide-react';
import type { Company } from '@/lib/types';

interface ManageCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  onAdd: () => void;
}

export function ManageCompaniesModal({
  isOpen,
  onClose,
  companies,
  onEdit,
  onDelete,
  onAdd,
}: ManageCompaniesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Manage Companies</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {companies.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No companies available</p>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold">{company.name}</p>
                    {company.email && (
                      <p className="text-sm text-slate-600">{company.email}</p>
                    )}
                    {company.city && company.country && (
                      <p className="text-sm text-slate-600">
                        {company.city}, {company.country}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<Edit className="h-4 w-4" />}
                      onClick={() => onEdit(company)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash className="h-4 w-4" />}
                      onClick={() => onDelete(company.id)}
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
