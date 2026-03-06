'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PermissionsContextType {
  permissions: string[];
  roles: string[];
  loading: boolean;
  isSystemUser: boolean;
  hasPermission: (key: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  roles: [],
  loading: true,
  isSystemUser: false,
  hasPermission: () => false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSystemUser, setIsSystemUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function fetchPermissions() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPermissions([]);
          setRoles([]);
          setIsSystemUser(false);
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
        setLoading(false);
      }
    }

    fetchPermissions();
    return () => { cancelled = true; };
  }, [pathname]);

  const hasPermission = (key: string) => permissions.includes(key);

  return (
    <PermissionsContext.Provider value={{ permissions, roles, loading, isSystemUser, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}
