'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleProvider';

function formatRecordCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

export interface PaginationProps {
  currentPage: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function Pagination({
  currentPage,
  totalCount,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: PaginationProps) {
  const { t: tCommon } = useTranslation('common');
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  function handlePageInputSubmit() {
    const page = parseInt(pageInput);
    if (isNaN(page) || page === currentPage || page < 1 || page > totalPages) {
      setPageInput(String(currentPage));
      return;
    }
    onPageChange(page);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3 sm:gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Button
          isIconOnly
          isDisabled={!hasPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={tCommon('pagination.previous')}
          startContent={<ChevronLeft className="size-6" />}
        />
        <span className="text-default-500">{tCommon('pagination.pageLabel')}</span>
        <Form onSubmit={(e) => { e.preventDefault(); handlePageInputSubmit(); }} className="inline">
          <Input
            type="number"
            className="w-18"
            classNames={{ input: "text-center" }}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            min={1}
            max={totalPages || 1}
            aria-label={tCommon('pagination.pageLabel')}
          />
        </Form>
        <span className="text-default-500">
          {totalPages > 0
            ? tCommon('pagination.ofPages', { total: totalPages.toLocaleString() })
            : ''}
        </span>
        <Button
          isIconOnly
          isDisabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={tCommon('pagination.next')}
          startContent={<ChevronRight className="size-6" />}
        />
      </div>

      <div className="w-full sm:w-fit flex items-center justify-center gap-3">
        <Select
          aria-label={tCommon('pagination.rowsPerPage')}
          className="w-42"
          selectedKeys={[String(rowsPerPage)]}
          onSelectionChange={(keys) => {
            const value = Number(Array.from(keys)[0]);
            onRowsPerPageChange(value);
          }}
        >
          <SelectItem key="10" textValue="10 rows">10 {tCommon('pagination.rows')}</SelectItem>
          <SelectItem key="25" textValue="25 rows">25 {tCommon('pagination.rows')}</SelectItem>
          <SelectItem key="50" textValue="50 rows">50 {tCommon('pagination.rows')}</SelectItem>
          <SelectItem key="100" textValue="100 rows">100 {tCommon('pagination.rows')}</SelectItem>
        </Select>

        <span className="text-default-400 whitespace-nowrap">
          {formatRecordCount(totalCount)} {tCommon('pagination.records')}
        </span>
      </div>
    </div>
  );
}
