'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Spinner } from "@heroui/spinner";
import { rolesApi } from '@/features/roles/api';
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

  useEffect(() => {
    if (isOpen && role) {
      loadPermissions();
    }
  }, [isOpen, role]);

  async function loadPermissions() {
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
  }

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
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
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
            <div className="flex flex-col gap-6">
              {Object.entries(grouped).map(([category, perms]) => {
                const allSelected = perms.every((p) => selectedIds.has(p.id));
                const someSelected = perms.some((p) => selectedIds.has(p.id));
                return (
                  <div key={category} className="border border-divider rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox
                        isSelected={allSelected}
                        isIndeterminate={someSelected && !allSelected}
                        onValueChange={() => toggleGroup(category)}
                      >
                        <span className="font-semibold capitalize text-sm">
                          {category}
                        </span>
                      </Checkbox>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                      {perms.map((perm) => (
                        <Checkbox
                          key={perm.id}
                          isSelected={selectedIds.has(perm.id)}
                          onValueChange={() => togglePermission(perm.id)}
                          size="sm"
                        >
                          <span className="text-xs">{perm.key}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
