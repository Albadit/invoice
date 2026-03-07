'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Plus, Edit, Trash, Lock, ShieldCheck, GripVertical } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { rolesApi } from '@/features/roles/api';
import {
  AddRoleModal,
  EditRoleModal,
  EditRolePermissionsModal,
} from '@/features/roles/components';
import { ConfirmModal, StickyHeader, Pagination, ActionDropdown } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Role } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

function SortableRow({
  role,
  children,
  canDrag,
}: {
  role: Role;
  children: React.ReactNode;
  canDrag: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' as const : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-divider last:border-0">
      <td className="py-3 px-3 w-10">
        {canDrag ? (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-default-400 hover:text-default-600 touch-none">
            <GripVertical className="size-4" />
          </button>
        ) : (
          <Lock className="size-4 text-default-300" />
        )}
      </td>
      {children}
    </tr>
  );
}

export default function RolesPage() {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesApi.getAll();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
      addToast({
        title: tCommon('common.error'),
        description: t('messages.loadError'),
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [t, tCommon]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Pagination
  const sortedRoles = [...roles].sort((a, b) => a.level - b.level);
  const totalCount = sortedRoles.length;
  const paginatedRoles = sortedRoles.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedRoles.findIndex((r) => r.id === active.id);
    const newIndex = sortedRoles.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Prevent dropping above system roles
    const systemCount = sortedRoles.filter((r) => r.is_system).length;
    if (newIndex < systemCount) return;

    const reordered = arrayMove(sortedRoles, oldIndex, newIndex);
    const updates = reordered.map((role, i) => ({ id: role.id, level: i + 1 }));

    // Optimistic update
    setRoles(reordered.map((role, i) => ({ ...role, level: i + 1 })));

    try {
      await rolesApi.updateLevels(updates);
      addToast({
        title: t('messages.success'),
        description: t('messages.levelUpdated'),
        color: 'success',
      });
    } catch {
      await loadRoles();
      addToast({
        title: tCommon('common.error'),
        description: t('messages.levelUpdateError'),
        color: 'danger',
      });
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  async function handleAddRole(data: { name: string; description: string }) {
    try {
      await rolesApi.create(data);
      await loadRoles();
      addToast({
        title: t('messages.success'),
        description: t('messages.created'),
        color: 'success',
      });
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.createError'),
        color: 'danger',
      });
      throw new Error();
    }
  }

  async function handleEditRole(data: { name: string; description: string }) {
    if (!selectedRole) return;
    try {
      await rolesApi.update(selectedRole.id, data);
      await loadRoles();
      addToast({
        title: t('messages.success'),
        description: t('messages.updated'),
        color: 'success',
      });
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.updateError'),
        color: 'danger',
      });
      throw new Error();
    }
  }

  function handleDeleteRole(role: Role) {
    setConfirmModal({
      isOpen: true,
      title: t('deleteRole'),
      message: t('messages.confirmDelete', { name: role.name }),
      action: async () => {
        try {
          await rolesApi.delete(role.id);
          await loadRoles();
          addToast({
            title: t('messages.success'),
            description: t('messages.deleted'),
            color: 'success',
          });
        } catch {
          addToast({
            title: tCommon('common.error'),
            description: t('messages.deleteError'),
            color: 'danger',
          });
        }
      },
    });
  }

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <ViewAuth permission="roles:create">
          <div className="w-full sm:w-auto sm:ml-auto shrink-0">
            <Button
              className="w-full sm:w-auto"
              color="primary"
              startContent={<Plus className="size-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              {t('addRole')}
            </Button>
          </div>
        </ViewAuth>
      </StickyHeader>

      <div className="w-full overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
          <table className={`w-full text-sm ${loading ? 'opacity-60' : 'opacity-100'} transition-opacity`}>
            <thead>
              <tr className="border-b border-divider">
                <th className="py-3 px-3 w-10" />
                <th className="text-left text-xs font-semibold text-default-500 py-3 px-3 whitespace-nowrap">{t('columns.name')}</th>
                <th className="text-left text-xs font-semibold text-default-500 py-3 px-3 whitespace-nowrap">{t('columns.description')}</th>
                <th className="text-left text-xs font-semibold text-default-500 py-3 px-3 whitespace-nowrap">{t('columns.type')}</th>
                <th className="text-left text-xs font-semibold text-default-500 py-3 px-3 whitespace-nowrap">{t('columns.actions')}</th>
              </tr>
            </thead>
            <SortableContext items={paginatedRoles.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-default-400">{t('noData')}</td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => (
                    <SortableRow key={role.id} role={role} canDrag={!role.is_system && hasPermission('roles:update')}>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium">{role.name}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-sm text-default-500">
                          {role.description || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {role.is_system ? (
                          <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
                            {t('system')}
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="flat" color="default">
                            {t('custom')}
                          </Chip>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <ActionDropdown items={[
                          {
                            key: 'permissions',
                            label: t('permissions'),
                            icon: <ShieldCheck className="size-4" />,
                            color: 'primary',
                            isHidden: !hasPermission('roles:update'),
                            isDisabled: role.is_system,
                            onClick: () => {
                              setSelectedRole(role);
                              setIsPermissionsOpen(true);
                            },
                          },
                          {
                            key: 'edit',
                            label: tCommon('actions.edit'),
                            icon: <Edit className="size-4" />,
                            color: 'primary',
                            isHidden: !hasPermission('roles:update') || role.is_system,
                            onClick: () => {
                              setSelectedRole(role);
                              setIsEditOpen(true);
                            },
                          },
                          {
                            key: 'delete',
                            label: tCommon('actions.delete'),
                            icon: <Trash className="size-4" />,
                            color: 'danger',
                            className: 'text-danger',
                            isHidden: !hasPermission('roles:delete') || role.is_system,
                            onClick: () => handleDeleteRole(role),
                          },
                        ]} />
                      </td>
                    </SortableRow>
                  ))
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddRole}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedRole(null);
        }}
        onSave={handleEditRole}
        role={selectedRole}
      />

      {/* Edit Role Permissions Modal */}
      <EditRolePermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => {
          setIsPermissionsOpen(false);
          setSelectedRole(null);
        }}
        onSave={loadRoles}
        role={selectedRole}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
        onConfirm={async () => {
          if (!confirmModal.action) return;
          setConfirmLoading(true);
          try {
            await confirmModal.action();
          } finally {
            setConfirmLoading(false);
            setConfirmModal({ isOpen: false, title: '', message: '', action: null });
          }
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmColor="danger"
        isLoading={confirmLoading}
      />
    </main>
  );
}
