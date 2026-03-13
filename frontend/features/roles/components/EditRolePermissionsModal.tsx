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
  readOnly?: boolean;
}

export function EditRolePermissionsModal({
  isOpen,
  onClose,
  onSave,
  role,
  readOnly = false,
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

  // Group permissions by category (prefix before ':') and derive sections dynamically
  const { grouped, dynamicSections, actions } = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    const actionSet = new Set<string>();
    for (const p of allPermissions) {
      const [category, action] = p.key.split(':');
      if (!groups[category]) groups[category] = [];
      groups[category].push(p);
      if (action) actionSet.add(action);
    }

    // Build sections: use known sections as ordering hints, then add "other" for the rest
    const assignedCategories = new Set<string>();
    const sections: { key: string; categories: string[] }[] = [];

    for (const section of permissionSections) {
      const cats = section.categories.filter((c) => groups[c]);
      for (const c of cats) assignedCategories.add(c);
      if (cats.length > 0) sections.push({ key: section.key, categories: cats });
    }

    // Collect any categories not in the predefined sections
    const otherCategories = Object.keys(groups)
      .filter((c) => !assignedCategories.has(c))
      .sort();
    if (otherCategories.length > 0) {
      sections.push({ key: 'other', categories: otherCategories });
    }

    // Derive action columns: prefer known order, append any new ones
    const knownActions = ['access', 'read', 'create', 'update', 'delete'];
    const orderedActions = knownActions.filter((a) => actionSet.has(a));
    for (const a of actionSet) {
      if (!orderedActions.includes(a)) orderedActions.push(a);
    }

    return { grouped: groups, dynamicSections: sections, actions: orderedActions };
  }, [allPermissions]);

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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
                {dynamicSections.map((section) => {
                  return (
                    <Fragment key={section.key}>
                      <tr>
                        <td colSpan={actions.length + 1} className="pt-5 pb-2 px-0">
                          <span className="text-xs font-bold uppercase tracking-wider text-default-400">
                            {t(`sections.${section.key}`)}
                          </span>
                        </td>
                      </tr>
                      {section.categories.map((category) => {
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
                                isDisabled={readOnly}
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
                                    isDisabled={readOnly}
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
            {readOnly ? tCommon('actions.close') : tCommon('actions.cancel')}
          </Button>
          {!readOnly && (
            <Button
              color="primary"
              onClick={handleSave}
              isLoading={saving}
              disabled={loading}
            >
              {tCommon('actions.save')}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
