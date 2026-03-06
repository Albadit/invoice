'use client';

import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { EllipsisVertical } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isHidden?: boolean;
  onClick: () => void;
}

export interface ActionDropdownProps {
  items: ActionItem[];
}

export function ActionDropdown({ items }: ActionDropdownProps) {
  const visibleItems = items.filter((item) => !item.isHidden);

  if (visibleItems.length === 0) return null;

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="light" size="sm" isIconOnly>
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        {visibleItems.map((item) => (
          <DropdownItem
            key={item.key}
            color={item.color}
            className={item.className}
            startContent={item.icon}
            isDisabled={item.isDisabled}
            onClick={item.onClick}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
