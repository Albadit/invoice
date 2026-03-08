'use client';

import { useState, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Building2, Users, FileText, ArrowRight } from 'lucide-react';
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

export interface ImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overwrite: OverwriteSelection) => void;
  preview: PreviewData | null;
  isLoading?: boolean;
}

// ─── Diff helper ────────────────────────────────────────────────

function DiffField({ label, existing, incoming }: { label: string; existing: string | null; incoming: string | null }) {
  const changed = (existing ?? '') !== (incoming ?? '');
  if (!changed) return null;
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="font-medium text-default-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="line-through text-danger-400 break-all">{existing || '—'}</span>
        <ArrowRight className="size-3 shrink-0 text-default-400" />
        <span className="text-success-600 font-medium break-all">{incoming || '—'}</span>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function ImportConflictModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading = false,
}: ImportConflictModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const totalConflicts = useMemo(() => {
    if (!preview) return 0;
    return preview.companies.conflicts.length + preview.clients.conflicts.length + preview.invoices.conflicts.length;
  }, [preview]);

  const totalNew = useMemo(() => {
    if (!preview) return 0;
    return preview.companies.new.length + preview.clients.new.length + preview.invoices.new.length;
  }, [preview]);

  const totalSelected = selectedCompanies.size + selectedClients.size + selectedInvoices.size;

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
    if (!preview) return;
    const overwrite: OverwriteSelection = {
      companies: Array.from(selectedCompanies),
      clients: Array.from(selectedClients),
      invoices: preview.invoices.conflicts
        .filter(c => selectedInvoices.has(`${c.incoming.customer_name}||${c.incoming.created_at}`))
        .map(c => ({ customer_name: c.incoming.customer_name, created_at: c.incoming.created_at! })),
    };
    onConfirm(overwrite);
  }

  if (!preview) return null;

  const hasConflicts = totalConflicts > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span>{t('backup.previewTitle')}</span>
          <span className="text-sm font-normal text-default-500">
            {t('backup.previewSubtitle', { newCount: totalNew, conflictCount: totalConflicts })}
          </span>
        </ModalHeader>
        <ModalBody className="gap-4">
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

          {!hasConflicts && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm">{t('backup.noConflicts')}</p>
            </div>
          )}

          {hasConflicts && (
            <Accordion selectionMode="multiple" variant="bordered" defaultExpandedKeys={['companies', 'clients', 'invoices']}>
              <AccordionItem
                key="companies"
                title={
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4" />
                    <span>{t('backup.companies')}</span>
                    <Chip size="sm" variant="flat" color="warning">{preview.companies.conflicts.length}</Chip>
                  </div>
                }
              >
                <div className="flex flex-col gap-3">
                  {preview.companies.conflicts.map((conflict) => (
                    <div
                      key={conflict.incoming.name}
                      className="p-3 rounded-lg border border-default-200 hover:border-warning-300 transition-colors"
                    >
                      <Checkbox
                        isSelected={selectedCompanies.has(conflict.incoming.name)}
                        onValueChange={() => toggleCompany(conflict.incoming.name)}
                        size="sm"
                      >
                        <span className="font-medium text-sm">{conflict.incoming.name}</span>
                        <span className="text-xs text-default-400 ml-2">{t('backup.overwrite')}</span>
                      </Checkbox>
                      <div className="ml-7 mt-2 flex flex-col gap-1">
                        <DiffField label={t('backup.diffEmail')} existing={conflict.existing.email} incoming={conflict.incoming.email} />
                        <DiffField label={t('backup.diffPhone')} existing={conflict.existing.phone} incoming={conflict.incoming.phone} />
                        <DiffField label={t('backup.diffCity')} existing={conflict.existing.city} incoming={conflict.incoming.city} />
                        <DiffField label={t('backup.diffCountry')} existing={conflict.existing.country} incoming={conflict.incoming.country} />
                        <DiffField label={t('backup.diffTax')} existing={conflict.existing.tax_percent} incoming={conflict.incoming.tax_percent} />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionItem>
              <AccordionItem
                key="clients"
                title={
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    <span>{t('backup.clients')}</span>
                    <Chip size="sm" variant="flat" color="warning">{preview.clients.conflicts.length}</Chip>
                  </div>
                }
              >
                <div className="flex flex-col gap-3">
                  {preview.clients.conflicts.map((conflict) => (
                    <div
                      key={conflict.incoming.name}
                      className="p-3 rounded-lg border border-default-200 hover:border-warning-300 transition-colors"
                    >
                      <Checkbox
                        isSelected={selectedClients.has(conflict.incoming.name)}
                        onValueChange={() => toggleClient(conflict.incoming.name)}
                        size="sm"
                      >
                        <span className="font-medium text-sm">{conflict.incoming.name}</span>
                        <span className="text-xs text-default-400 ml-2">{t('backup.overwrite')}</span>
                      </Checkbox>
                      <div className="ml-7 mt-2 flex flex-col gap-1">
                        <DiffField label={t('backup.diffEmail')} existing={conflict.existing.email} incoming={conflict.incoming.email} />
                        <DiffField label={t('backup.diffPhone')} existing={conflict.existing.phone} incoming={conflict.incoming.phone} />
                        <DiffField label={t('backup.diffCity')} existing={conflict.existing.city} incoming={conflict.incoming.city} />
                        <DiffField label={t('backup.diffCountry')} existing={conflict.existing.country} incoming={conflict.incoming.country} />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionItem>
              <AccordionItem
                key="invoices"
                title={
                  <div className="flex items-center gap-2">
                    <FileText className="size-4" />
                    <span>{t('backup.invoices')}</span>
                    <Chip size="sm" variant="flat" color="warning">{preview.invoices.conflicts.length}</Chip>
                  </div>
                }
              >
                <div className="flex flex-col gap-3">
                  {preview.invoices.conflicts.map((conflict) => {
                    const key = `${conflict.incoming.customer_name}||${conflict.incoming.created_at}`;
                    return (
                      <div
                        key={key}
                        className="p-3 rounded-lg border border-default-200 hover:border-warning-300 transition-colors"
                      >
                        <Checkbox
                          isSelected={selectedInvoices.has(key)}
                          onValueChange={() => toggleInvoice(key)}
                          size="sm"
                        >
                          <span className="font-medium text-sm">{conflict.incoming.customer_name}</span>
                          <span className="text-xs text-default-400 ml-2">
                            {conflict.incoming.issue_date} · {t('backup.overwrite')}
                          </span>
                        </Checkbox>
                        <div className="ml-7 mt-2 flex flex-col gap-1">
                          <DiffField label={t('backup.diffStatus')} existing={conflict.existing.status} incoming={conflict.incoming.status} />
                          <DiffField label={t('backup.diffTotal')} existing={conflict.existing.total_amount} incoming={conflict.incoming.total_amount} />
                          <DiffField label={t('backup.diffDueDate')} existing={conflict.existing.due_date} incoming={conflict.incoming.due_date} />
                          <DiffField label={t('backup.diffCompany')} existing={conflict.existing.company_name} incoming={conflict.incoming.company_name} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            </Accordion>
          )}
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color={totalSelected > 0 ? 'warning' : 'primary'}
            onPress={handleConfirm}
            isLoading={isLoading}
          >
            {totalSelected > 0
              ? t('backup.importAndOverwrite', { count: totalSelected })
              : t('backup.importSkipExisting')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
