'use client';

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Card, CardBody } from "@heroui/card";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Building2, Users, FileText, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleProvider';

// ─── Types ──────────────────────────────────────────────────────

interface ConflictItem<T> {
  incoming: T;
  existing: T;
}

interface BackupCompany {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tax_percent: string | null;
  terms: string | null;
}

interface BackupClient {
  company_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

interface BackupInvoice {
  company_name: string | null;
  customer_name: string;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  total_amount: string | null;
  created_at: string | null;
}

export interface PreviewData {
  companies: { new: BackupCompany[]; conflicts: ConflictItem<BackupCompany>[] };
  clients: { new: BackupClient[]; conflicts: ConflictItem<BackupClient>[] };
  invoices: { new: BackupInvoice[]; conflicts: ConflictItem<BackupInvoice>[] };
}

export interface OverwriteSelection {
  companies: string[];
  clients: string[];
  invoices: { customer_name: string; created_at: string }[];
}

export interface ImportPreviewPanelProps {
  onConfirm: (overwrite: OverwriteSelection) => void;
  preview: PreviewData;
  isLoading?: boolean;
  onSelectionChange?: (count: number) => void;
}

export interface ImportPreviewPanelHandle {
  confirm: () => void;
}

// ─── Compare row helper ─────────────────────────────────────────

function CompareRow({ label, existing, incoming }: { label: string; existing: string | null; incoming: string | null }) {
  const oldVal = existing ?? '—';
  const newVal = incoming ?? '—';
  const changed = (existing ?? '') !== (incoming ?? '');
  return (
    <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs py-1.5 border-b border-default-100 last:border-b-0">
      <span className="font-medium text-default-500 truncate">{label}</span>
      <span className={`break-all ${changed ? 'text-danger-500 bg-danger-50 rounded px-1' : 'text-default-700'}`}>
        {oldVal}
      </span>
      <span className={`break-all ${changed ? 'text-success-600 bg-success-50 rounded px-1 font-medium' : 'text-default-700'}`}>
        {newVal}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────

export const ImportPreviewPanel = forwardRef<ImportPreviewPanelHandle, ImportPreviewPanelProps>(
  function ImportPreviewPanel({ onConfirm, preview, isLoading = false, onSelectionChange }, ref) {
    const { t } = useTranslation('settings');

    const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

    const totalConflicts = useMemo(() => {
      return preview.companies.conflicts.length + preview.clients.conflicts.length + preview.invoices.conflicts.length;
    }, [preview]);

    const totalNew = useMemo(() => {
      return preview.companies.new.length + preview.clients.new.length + preview.invoices.new.length;
    }, [preview]);

    const totalSelected = selectedCompanies.size + selectedClients.size + selectedInvoices.size;

    useEffect(() => {
      onSelectionChange?.(totalSelected);
    }, [totalSelected, onSelectionChange]);

    // ─── All-names helpers ────────────────────────────────────
    const allCompanyNames = useMemo(() => preview.companies.conflicts.map(c => c.incoming.name), [preview]);
    const allClientNames = useMemo(() => preview.clients.conflicts.map(c => c.incoming.name), [preview]);
    const allInvoiceKeys = useMemo(
      () => [...new Set(preview.invoices.conflicts.map(c => `${c.incoming.customer_name}||${c.incoming.created_at}`))],
      [preview],
    );

    const allCompaniesSelected = allCompanyNames.length > 0 && selectedCompanies.size === allCompanyNames.length;
    const allClientsSelected = allClientNames.length > 0 && selectedClients.size === allClientNames.length;
    const allInvoicesSelected = allInvoiceKeys.length > 0 && selectedInvoices.size === allInvoiceKeys.length;

    function toggleAllCompanies() {
      setSelectedCompanies(allCompaniesSelected ? new Set() : new Set(allCompanyNames));
    }
    function toggleAllClients() {
      setSelectedClients(allClientsSelected ? new Set() : new Set(allClientNames));
    }
    function toggleAllInvoices() {
      setSelectedInvoices(allInvoicesSelected ? new Set() : new Set(allInvoiceKeys));
    }

    function toggleCompany(name: string) {
      setSelectedCompanies(prev => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name); else next.add(name);
        return next;
      });
    }

    function toggleClient(name: string) {
      setSelectedClients(prev => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name); else next.add(name);
        return next;
      });
    }

    function toggleInvoice(key: string) {
      setSelectedInvoices(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    }

    function handleConfirm() {
      const overwrite: OverwriteSelection = {
        companies: Array.from(selectedCompanies),
        clients: Array.from(selectedClients),
        invoices: preview.invoices.conflicts
          .filter(c => selectedInvoices.has(`${c.incoming.customer_name}||${c.incoming.created_at}`))
          .map(c => ({ customer_name: c.incoming.customer_name, created_at: c.incoming.created_at! })),
      };
      onConfirm(overwrite);
    }

    useImperativeHandle(ref, () => ({ confirm: handleConfirm }));

    const hasConflicts = totalConflicts > 0;

    return (
      <div className="flex flex-col gap-6">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {totalNew > 0 && (
            <Chip color="success" variant="flat" size="sm">
              {t('backup.newRecords', { count: totalNew })}
            </Chip>
          )}
          {totalConflicts > 0 && (
            <Chip color="warning" variant="flat" size="sm">
              {t('backup.conflictRecords', { count: totalConflicts })}
            </Chip>
          )}
        </div>

        {/* No conflicts */}
        {!hasConflicts && (
          <Card className="border border-success/30 bg-success/5">
            <CardBody className="p-4">
              <p className="text-sm">{t('backup.noConflicts')}</p>
            </CardBody>
          </Card>
        )}

        {/* Conflicts accordion */}
        {hasConflicts && (
          <Accordion selectionMode="multiple" variant="bordered" defaultExpandedKeys={[
            ...(preview.companies.conflicts.length > 0 ? ['companies'] : []),
            ...(preview.clients.conflicts.length > 0 ? ['clients'] : []),
            ...(preview.invoices.conflicts.length > 0 ? ['invoices'] : []),
          ]}>
            <AccordionItem
              key="companies"
              textValue={`${t('backup.companies')} ${preview.companies.conflicts.length}`}
              className={preview.companies.conflicts.length === 0 ? 'hidden' : ''}
              title={
                <div className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  <span>{t('backup.companies')}</span>
                  <Chip size="sm" variant="flat" color="warning">{preview.companies.conflicts.length}</Chip>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {preview.companies.conflicts.length > 1 && (
                  <Checkbox
                    isSelected={allCompaniesSelected}
                    onValueChange={toggleAllCompanies}
                    size="sm"
                  >
                    <span className="text-sm">{t('backup.selectAll')}</span>
                  </Checkbox>
                )}
                {preview.companies.conflicts.map((conflict) => {
                  const selected = selectedCompanies.has(conflict.incoming.name);
                  return (
                    <Card key={conflict.incoming.name} className={`border ${selected ? 'border-warning-400 bg-warning-50/30' : 'border-default-200'} transition-colors`}>
                      <CardBody className="p-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-default-100">
                          <Checkbox
                            isSelected={selected}
                            onValueChange={() => toggleCompany(conflict.incoming.name)}
                            size="sm"
                          />
                          <span className="font-semibold text-sm">{conflict.incoming.name}</span>
                          <ArrowLeftRight className="size-3.5 text-default-400 ml-auto" />
                        </div>
                        <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-4 py-2 bg-default-50 text-[11px] font-semibold text-default-500 uppercase tracking-wider">
                          <span>{t('backup.compareField')}</span>
                          <span>{t('backup.compareCurrent')}</span>
                          <span>{t('backup.compareIncoming')}</span>
                        </div>
                        <div className="px-4 py-1">
                          <CompareRow label={t('backup.diffEmail')} existing={conflict.existing.email} incoming={conflict.incoming.email} />
                          <CompareRow label={t('backup.diffPhone')} existing={conflict.existing.phone} incoming={conflict.incoming.phone} />
                          <CompareRow label={t('backup.diffCity')} existing={conflict.existing.city} incoming={conflict.incoming.city} />
                          <CompareRow label={t('backup.diffCountry')} existing={conflict.existing.country} incoming={conflict.incoming.country} />
                          <CompareRow label={t('backup.diffTax')} existing={conflict.existing.tax_percent} incoming={conflict.incoming.tax_percent} />
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </AccordionItem>
            <AccordionItem
              key="clients"
              textValue={`${t('backup.clients')} ${preview.clients.conflicts.length}`}
              className={preview.clients.conflicts.length === 0 ? 'hidden' : ''}
              title={
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  <span>{t('backup.clients')}</span>
                  <Chip size="sm" variant="flat" color="warning">{preview.clients.conflicts.length}</Chip>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {preview.clients.conflicts.length > 1 && (
                  <Checkbox
                    isSelected={allClientsSelected}
                    onValueChange={toggleAllClients}
                    size="sm"
                  >
                    <span className="text-sm">{t('backup.selectAll')}</span>
                  </Checkbox>
                )}
                {preview.clients.conflicts.map((conflict) => {
                  const selected = selectedClients.has(conflict.incoming.name);
                  return (
                    <Card key={conflict.incoming.name} className={`border ${selected ? 'border-warning-400 bg-warning-50/30' : 'border-default-200'} transition-colors`}>
                      <CardBody className="p-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-default-100">
                          <Checkbox
                            isSelected={selected}
                            onValueChange={() => toggleClient(conflict.incoming.name)}
                            size="sm"
                          />
                          <span className="font-semibold text-sm">{conflict.incoming.name}</span>
                          <ArrowLeftRight className="size-3.5 text-default-400 ml-auto" />
                        </div>
                        <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-4 py-2 bg-default-50 text-[11px] font-semibold text-default-500 uppercase tracking-wider">
                          <span>{t('backup.compareField')}</span>
                          <span>{t('backup.compareCurrent')}</span>
                          <span>{t('backup.compareIncoming')}</span>
                        </div>
                        <div className="px-4 py-1">
                          <CompareRow label={t('backup.diffEmail')} existing={conflict.existing.email} incoming={conflict.incoming.email} />
                          <CompareRow label={t('backup.diffPhone')} existing={conflict.existing.phone} incoming={conflict.incoming.phone} />
                          <CompareRow label={t('backup.diffCity')} existing={conflict.existing.city} incoming={conflict.incoming.city} />
                          <CompareRow label={t('backup.diffCountry')} existing={conflict.existing.country} incoming={conflict.incoming.country} />
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </AccordionItem>
            <AccordionItem
              key="invoices"
              textValue={`${t('backup.invoices')} ${preview.invoices.conflicts.length}`}
              className={preview.invoices.conflicts.length === 0 ? 'hidden' : ''}
              title={
                <div className="flex items-center gap-2">
                  <FileText className="size-4" />
                  <span>{t('backup.invoices')}</span>
                  <Chip size="sm" variant="flat" color="warning">{preview.invoices.conflicts.length}</Chip>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {preview.invoices.conflicts.length > 1 && (
                  <Checkbox
                    isSelected={allInvoicesSelected}
                    onValueChange={toggleAllInvoices}
                    size="sm"
                  >
                    <span className="text-sm">{t('backup.selectAll')}</span>
                  </Checkbox>
                )}
                {preview.invoices.conflicts.map((conflict, idx) => {
                  const key = `${conflict.incoming.customer_name}||${conflict.incoming.created_at}`;
                  const selected = selectedInvoices.has(key);
                  return (
                    <Card key={`${key}::${idx}`} className={`border ${selected ? 'border-warning-400 bg-warning-50/30' : 'border-default-200'} transition-colors`}>
                      <CardBody className="p-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-default-100">
                          <Checkbox
                            isSelected={selected}
                            onValueChange={() => toggleInvoice(key)}
                            size="sm"
                          />
                          <span className="font-semibold text-sm">{conflict.incoming.customer_name}</span>
                          <span className="text-xs text-default-400">{conflict.incoming.issue_date}</span>
                          <ArrowLeftRight className="size-3.5 text-default-400 ml-auto" />
                        </div>
                        <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-4 py-2 bg-default-50 text-[11px] font-semibold text-default-500 uppercase tracking-wider">
                          <span>{t('backup.compareField')}</span>
                          <span>{t('backup.compareCurrent')}</span>
                          <span>{t('backup.compareIncoming')}</span>
                        </div>
                        <div className="px-4 py-1">
                          <CompareRow label={t('backup.diffStatus')} existing={conflict.existing.status} incoming={conflict.incoming.status} />
                          <CompareRow label={t('backup.diffTotal')} existing={conflict.existing.total_amount} incoming={conflict.incoming.total_amount} />
                          <CompareRow label={t('backup.diffDueDate')} existing={conflict.existing.due_date} incoming={conflict.incoming.due_date} />
                          <CompareRow label={t('backup.diffCompany')} existing={conflict.existing.company_name} incoming={conflict.incoming.company_name} />
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    );
  },
);
