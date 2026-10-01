"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAuthenticated, getUserRole } from "@/lib/auth-storage";
import { defaultActionGranted } from "@/lib/permissions-catalog";
import { checkPermission as checkPermissionSync } from "@/lib/permissions-check";
import { permissoesService } from "@/lib/permissions-service";
import {
  clearMyPermissions,
  hasPermissionKey,
  setMyPermissions,
  subscribeMyPermissions,
} from "@/lib/permissions-store";

export { checkPermission, checkMenuPermission } from "@/lib/permissions-check";

type PermissionsContextValue = {
  loaded: boolean;
  usingDefaults: boolean;
  /** Incrementa a cada atualização do store (menu/actions reagem). */
  revision: number;
  hasPermission: (key: string) => boolean;
  refresh: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      clearMyPermissions();
      setLoaded(false);
      setUsingDefaults(true);
      return;
    }
    try {
      const data = await permissoesService.minhas();
      setMyPermissions(data.permissions ?? [], Boolean(data.usingDefaults));
      setUsingDefaults(Boolean(data.usingDefaults));
      setLoaded(true);
    } catch {
      clearMyPermissions();
      setLoaded(false);
      setUsingDefaults(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => clearMyPermissions();
  }, [refresh]);

  useEffect(() => subscribeMyPermissions(() => setRevision((t) => t + 1)), []);

  const hasPermission = useCallback((key: string): boolean => {
    return checkPermissionSync(key);
  }, []);

  const value = useMemo(
    () => ({ loaded, usingDefaults, revision, hasPermission, refresh }),
    [loaded, usingDefaults, revision, hasPermission, refresh],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return {
      loaded: false,
      usingDefaults: true,
      revision: 0,
      hasPermission: (key: string) => {
        const role = getUserRole();
        if (role === "ADMIN") return true;
        const fromStore = hasPermissionKey(key);
        if (fromStore != null) return fromStore;
        if (key.startsWith("action.")) return defaultActionGranted(key, role);
        return false;
      },
      refresh: async () => undefined,
    };
  }
  return ctx;
}
