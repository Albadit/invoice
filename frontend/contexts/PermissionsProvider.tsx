'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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

/** Shape returned by the /api/auth/permissions API route. */
interface PermissionsResponse {
  permissions: string[];
  roles: string[];
  isSystemUser: boolean;
  userId: string | null;
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
      try {
        const res = await fetch('/api/auth/permissions');
        if (!res.ok) throw new Error('Failed to fetch permissions');
        const data: PermissionsResponse = await res.json();

        if (!cancelled) {
          setPermissions(data.permissions);
          setRoles(data.roles);
          setIsSystemUser(data.isSystemUser);
          setUserId(data.userId);
        }
      } catch {
        if (!cancelled) {
          setPermissions([]);
          setRoles([]);
          setIsSystemUser(false);
          setUserId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
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
