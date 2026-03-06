'use client';

import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Switch } from "@heroui/switch";
import { Spinner } from "@heroui/spinner";
import { rolesApi } from '@/features/roles/api';
import { permissionSections } from '@/features/roles/constants';
import type { Role, Permission } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditRolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  role: Role | null;
}

export function EditRolePermissionsModal({
  isOpen,
  onClose,
  onSave,
  role,
}: EditRolePermissionsModalProps) {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const [perms, assignedIds] = await Promise.all([
        rolesApi.getAllPermissions(),
        rolesApi.getRolePermissionIds(role!.id),
      ]);
      setAllPermissions(perms);
      setSelectedIds(new Set(assignedIds));
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (isOpen && role) {
      loadPermissions();
    }
  }, [isOpen, role, loadPermissions]);

  // Group permissions by category (prefix before ':')
  const grouped = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      const category = p.key.split(':')[0];
      if (!groups[category]) groups[category] = [];
      groups[category].push(p);
    }
    return groups;
  }, [allPermissions]);

  function findPermId(category: string, action: string): string | undefined {
    return allPermissions.find((p) => p.key === `${category}:${action}`)?.id;
  }

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const perm = allPermissions.find((p) => p.id === id);
      if (!perm) return next;

      const [category, action] = perm.key.split(':');
      const isEnabling = !next.has(id);

      if (isEnabling) {
        next.add(id);
        // create/update/delete → auto-enable read
        if (['create', 'update', 'delete'].includes(action)) {
          const readId = findPermId(category, 'read');
          if (readId) next.add(readId);
        }
        // read → auto-enable access
        if (action === 'read' || ['create', 'update', 'delete'].includes(action)) {
          const accessId = findPermId(category, 'access');
          if (accessId) next.add(accessId);
        }
      } else {
        next.delete(id);
        // disabling access → disable all in category
        if (action === 'access') {
          for (const p of grouped[category] || []) {
            next.delete(p.id);
          }
        }
        // disabling read → disable create/update/delete
        if (action === 'read') {
          for (const a of ['create', 'update', 'delete']) {
            const depId = findPermId(category, a);
            if (depId) next.delete(depId);
          }
        }
      }
      return next;
    });
  }

  function toggleGroup(category: string) {
    const groupPerms = grouped[category] || [];
    const allSelected = groupPerms.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of groupPerms) {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  }

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await rolesApi.setRolePermissions(role.id, Array.from(selectedIds));
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  // Ordered actions for column headers
  const actions = ['access', 'read', 'create', 'update', 'delete'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          {t('managePermissions')}: {role?.name}
        </ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left text-xs font-semibold text-default-500 py-2 pr-4"></th>
                  {actions.map((a) => (
                    <th key={a} className="text-center text-xs font-semibold text-default-500 py-2 px-1 capitalize">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionSections.map((section) => {
                  const sectionCategories = section.categories.filter((c) => grouped[c]);
                  if (sectionCategories.length === 0) return null;
                  return (
                    <Fragment key={section.key}>
                      <tr>
                        <td colSpan={actions.length + 1} className="pt-5 pb-2 px-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-default-400">
                            {t(`sections.${section.key}`)}
                          </span>
                        </td>
                      </tr>
                      {sectionCategories.map((category) => {
                        const perms = grouped[category];
                        const allSelected = perms.every((p) => selectedIds.has(p.id));
                        const someSelected = perms.some((p) => selectedIds.has(p.id));
                        return (
                          <tr key={category} className="border-b border-divider last:border-0">
                            <td className="py-3 pr-4">
                              <Checkbox
                                isSelected={allSelected}
                                isIndeterminate={someSelected && !allSelected}
                                onValueChange={() => toggleGroup(category)}
                                size="sm"
                              >
                                <span className="font-medium capitalize text-sm">{category}</span>
                              </Checkbox>
                            </td>
                            {actions.map((action) => {
                              const perm = perms.find((p) => p.key === `${category}:${action}`);
                              if (!perm) return <td key={action} className="text-center py-3 px-1" />;
                              return (
                                <td key={action} className="text-center py-3 px-1">
                                  <Switch
                                    size="sm"
                                    isSelected={selectedIds.has(perm.id)}
                                    onValueChange={() => togglePermission(perm.id)}
                                    aria-label={perm.key}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose} disabled={saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={loading}
          >
            {tCommon('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
