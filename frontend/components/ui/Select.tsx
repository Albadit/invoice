'use client';

import type { SelectProps } from "@heroui/react";
import type { VariantProps } from "tailwind-variants";
import type { Key } from 'react';

import { Select as HeroUISelect, SelectItem, Autocomplete } from "@heroui/react";
import { tv } from "tailwind-variants";

const selectVariants = tv({
  base: "",
  variants: {
    styling: {
      primary: "[&>div>button]:border-1 [&>div>button]:border-card-border [&>div>button]:bg-white",
      secondary: "",
    },
  },
});

const stylingProps = {
  primary: {
    radius: "sm" as const,
  },
  secondary: {
    radius: "sm" as const,
  },
} as const;

type SelectVariants = VariantProps<typeof selectVariants>;
export type MySelectProps<T extends object = object> = Omit<SelectProps<T>, "className"> &
  SelectVariants & {
    className?: string;
    search?: boolean;
  };

export default function Select<T extends object = object>({
  className,
  styling,
  search = false,
  children,
  ...props
}: MySelectProps<T>) {
  const styleSpecificProps = styling ? stylingProps[styling] : {};
  const cn = selectVariants({ className, styling });

  if (search) {
    const {
      selectedKeys,
      onSelectionChange,
      selectionMode: _selectionMode,
      disallowEmptySelection: _disallow,
      renderValue: _renderValue,
      ...autocompleteProps
    } = props as any;

    let selectedKey: string | null = null;
    if (selectedKeys) {
      const arr = selectedKeys instanceof Set
        ? Array.from(selectedKeys)
        : Array.isArray(selectedKeys) ? selectedKeys : [];
      selectedKey = arr.length > 0 ? String(arr[0]) : null;
    }

    return (
      <Autocomplete
        className={cn}
        selectedKey={selectedKey}
        onSelectionChange={(key: Key | null) => {
          if (onSelectionChange) {
            (onSelectionChange as any)(key != null ? new Set([String(key)]) : new Set());
          }
        }}
        {...styleSpecificProps}
        {...autocompleteProps}
      >
        {children as any}
      </Autocomplete>
    );
  }

  return (
    <HeroUISelect<T>
      className={cn}
      {...styleSpecificProps}
      {...props}
    >
      {children}
    </HeroUISelect>
  );
}

export { SelectItem };
