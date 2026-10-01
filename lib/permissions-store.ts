/** Store em memória das permissões efetivas do usuário logado. */

type Listener = () => void;

let permissions: Set<string> | null = null;
let usingDefaults = true;
let loaded = false;
const listeners = new Set<Listener>();

export function setMyPermissions(keys: string[] | Set<string>, defaults: boolean): void {
  permissions = keys instanceof Set ? keys : new Set(keys);
  usingDefaults = defaults;
  loaded = true;
  listeners.forEach((l) => l());
}

export function clearMyPermissions(): void {
  permissions = null;
  usingDefaults = true;
  loaded = false;
  listeners.forEach((l) => l());
}

export function getMyPermissionsSnapshot(): {
  permissions: Set<string> | null;
  usingDefaults: boolean;
  loaded: boolean;
} {
  return { permissions, usingDefaults, loaded };
}

export function subscribeMyPermissions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasPermissionKey(key: string): boolean | null {
  if (!loaded || !permissions) return null;
  return permissions.has(key);
}
