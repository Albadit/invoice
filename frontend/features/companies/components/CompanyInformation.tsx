'use client';

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Trash, Edit } from 'lucide-react';

interface CompanyInformationProps {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyStreet: string;
  companyCity: string;
  companyZipCode: string;
  companyCountry: string;
  onDelete: () => void;
  onEdit: () => void;
}

export function CompanyInformation({
  companyName,
  companyEmail,
  companyPhone,
  companyStreet,
  companyCity,
  companyZipCode,
  companyCountry,
  onDelete,
  onEdit,
}: CompanyInformationProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Company Information</h2>
        <div className="flex gap-2">
          <Button 
            color="primary" 
            variant="flat"
            onClick={onEdit}
            startContent={<Edit className="size-4" />}
          >
            Edit
          </Button>
          <Button 
            color="danger" 
            variant="flat"
            onClick={onDelete}
            startContent={<Trash className="size-4" />}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Company Name</span>
          <Input value={companyName} isReadOnly />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Email</span>
          <Input value={companyEmail} isReadOnly />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Phone</span>
          <Input value={companyPhone} isReadOnly />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Street</span>
          <Input value={companyStreet} isReadOnly />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">City</span>
          <Input value={companyCity} isReadOnly />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Zip Code</span>
          <Input value={companyZipCode} isReadOnly />
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <span className="text-sm font-semibold">Country</span>
          <Input value={companyCountry} isReadOnly />
        </div>
      </div>
    </section>
  );
}
