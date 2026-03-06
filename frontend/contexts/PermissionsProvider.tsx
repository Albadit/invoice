'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PermissionsContextType {
  permissions: string[];
  roles: string[];
  loading: boolean;
  isSystemUser: boolean;
  userId: string | null;
  hasPermission: (key: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  roles: [],
  loading: true,
  isSystemUser: false,
  userId: null,
  hasPermission: () => false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSystemUser, setIsSystemUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPermissions() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPermissions([]);
          setRoles([]);
          setIsSystemUser(false);
          setUserId(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('is_system, role:roles!inner(name, role_permissions:role_permissions!inner(permission:permissions!inner(key)))')
        .eq('user_id', user.id);

      if (error || !data) {
        if (!cancelled) {
          setPermissions([]);
          setRoles([]);
          setIsSystemUser(false);
          setUserId(user.id);
          setLoading(false);
        }
        return;
      }

      const permissionKeys = new Set<string>();
      const roleNames = new Set<string>();
      let systemFlag = false;

      for (const ur of data) {
        if (ur.is_system) systemFlag = true;
        const role = ur.role as unknown as {
          name: string;
          role_permissions: { permission: { key: string } }[];
        };
        roleNames.add(role.name);
        for (const rp of role.role_permissions) {
          permissionKeys.add(rp.permission.key);
        }
      }

      if (!cancelled) {
        setPermissions(Array.from(permissionKeys));
        setRoles(Array.from(roleNames));
        setIsSystemUser(systemFlag);
        setUserId(user.id);
        setLoading(false);
      }
    }

    fetchPermissions();
    return () => { cancelled = true; };
  }, []);

  const hasPermission = useCallback(
    (key: string) => permissions.includes(key),
    [permissions]
  );

  return (
    <PermissionsContext.Provider value={{ permissions, roles, loading, isSystemUser, userId, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}
