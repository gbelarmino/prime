import type { MenuChildDef, MenuGroupItem, MenuLinkItem } from "@/lib/dashboard-menu-items";
import { getMenuItemId } from "@/lib/dashboard-menu-items";

export type MenuPreference = {
  topLevel: string[];
  children: Record<string, string[]>;
};

const STORAGE_VERSION = "v1";
const STORAGE_PREFIX = `aires_dashboard_menu_${STORAGE_VERSION}`;

function storageKey(email: string, role: string): string {
  return `${STORAGE_PREFIX}:${email.toLowerCase().trim()}:${role}`;
}

export function buildMenuPreferenceFromItems(items: (MenuLinkItem | MenuGroupItem)[]): MenuPreference {
  const children: Record<string, string[]> = {};
  for (const item of items) {
    if (item.kind === "group") {
      children[item.id] = item.children.map((c) => c.id);
    }
  }
  return {
    topLevel: items.map(getMenuItemId),
    children,
  };
}

function orderByIds<T extends { id: string }>(items: T[], ids: string[] | undefined): T[] {
  if (!ids?.length) return items;
  const remaining = new Map(items.map((i) => [i.id, i]));
  const ordered: T[] = [];
  for (const id of ids) {
    const found = remaining.get(id);
    if (found) {
      ordered.push(found);
      remaining.delete(id);
    }
  }
  for (const item of remaining.values()) {
    ordered.push(item);
  }
  return ordered;
}

export function applyMenuPreference(
  items: (MenuLinkItem | MenuGroupItem)[],
  preference: MenuPreference | null,
): (MenuLinkItem | MenuGroupItem)[] {
  if (!preference) return items;

  const itemMap = new Map(items.map((i) => [getMenuItemId(i), i]));
  const orderedTop: (MenuLinkItem | MenuGroupItem)[] = [];

  for (const id of preference.topLevel) {
    const item = itemMap.get(id);
    if (!item) continue;
    if (item.kind === "group") {
      const childOrder = preference.children[id];
      orderedTop.push({
        ...item,
        children: orderByIds(item.children, childOrder),
      });
    } else {
      orderedTop.push(item);
    }
    itemMap.delete(id);
  }

  for (const item of itemMap.values()) {
    if (item.kind === "group") {
      const childOrder = preference.children[item.id];
      orderedTop.push({
        ...item,
        children: orderByIds(item.children, childOrder),
      });
    } else {
      orderedTop.push(item);
    }
  }

  return orderedTop;
}

export function loadMenuPreference(email: string | null, role: string | null): MenuPreference | null {
  if (typeof window === "undefined" || !email?.trim() || !role) return null;
  try {
    const raw = localStorage.getItem(storageKey(email, role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuPreference;
    if (!Array.isArray(parsed.topLevel) || typeof parsed.children !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMenuPreference(email: string, role: string, preference: MenuPreference): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(email, role), JSON.stringify(preference));
}

export function clearMenuPreference(email: string, role: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(email, role));
}

export function reorderIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) {
    return ids;
  }
  const next = [...ids];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export type MenuPreferenceChildMeta = MenuChildDef;
