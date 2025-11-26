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
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Company Information</h2>
        <div className="flex gap-2">
          <Button 
            color="primary" 
            variant="flat"
            onClick={onEdit}
            startContent={<Edit className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Button 
            color="danger" 
            variant="flat"
            onClick={onDelete}
            startContent={<Trash className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-semibold block mb-2">Company Name</span>
          <Input value={companyName} isReadOnly />
        </div>
        <div>
          <span className="text-sm font-semibold block mb-2">Email</span>
          <Input value={companyEmail} isReadOnly />
        </div>
        <div>
          <span className="text-sm font-semibold block mb-2">Phone</span>
          <Input value={companyPhone} isReadOnly />
        </div>
        <div>
          <span className="text-sm font-semibold block mb-2">Street</span>
          <Input value={companyStreet} isReadOnly />
        </div>
        <div>
          <span className="text-sm font-semibold block mb-2">City</span>
          <Input value={companyCity} isReadOnly />
        </div>
        <div>
          <span className="text-sm font-semibold block mb-2">Zip Code</span>
          <Input value={companyZipCode} isReadOnly />
        </div>
        <div className="col-span-2">
          <span className="text-sm font-semibold block mb-2">Country</span>
          <Input value={companyCountry} isReadOnly />
        </div>
      </div>
    </section>
  );
}
