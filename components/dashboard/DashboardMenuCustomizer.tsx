"use client";

import { useCallback, useMemo, useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuGroupItem, MenuLinkItem } from "@/lib/dashboard-menu-items";
import { getMenuItemId } from "@/lib/dashboard-menu-items";
import {
  buildMenuPreferenceFromItems,
  reorderIds,
  type MenuPreference,
} from "@/lib/dashboard-menu-preferences";

type Props = {
  items: (MenuLinkItem | MenuGroupItem)[];
  preference: MenuPreference;
  onPreferenceChange: (preference: MenuPreference) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
};

type DragTarget =
  | { scope: "top"; index: number }
  | { scope: "child"; groupId: string; index: number }
  | null;

function SortableRow({
  label,
  dragIndex,
  onDragStart,
  onDragOver,
  onDrop,
  nested,
}: {
  label: string;
  dragIndex: number;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  nested?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2.5 text-sm text-white/80 cursor-grab active:cursor-grabbing",
        nested && "ml-4 border-white/5",
      )}
    >
      <GripVertical size={16} className="shrink-0 text-white/30" aria-hidden />
      <span className="flex-1 truncate font-medium">{label}</span>
      <span className="text-[10px] text-white/25 tabular-nums">{dragIndex + 1}</span>
    </div>
  );
}

export function DashboardMenuCustomizer({
  items,
  preference,
  onPreferenceChange,
  onSave,
  onCancel,
  onReset,
}: Props) {
  const dragSourceRef = useRef<DragTarget>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [getMenuItemId(i), i])), [items]);

  const topLevelIds = useMemo(() => {
    const known = new Set(items.map(getMenuItemId));
    const ordered = preference.topLevel.filter((id) => known.has(id));
    for (const item of items) {
      const id = getMenuItemId(item);
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [items, preference.topLevel]);

  const commitReorder = useCallback(
    (from: DragTarget, to: DragTarget) => {
      if (!from || !to) return;
      if (from.scope === "top" && to.scope === "top") {
        onPreferenceChange({
          ...preference,
          topLevel: reorderIds(topLevelIds, from.index, to.index),
        });
        return;
      }
      if (from.scope === "child" && to.scope === "child" && from.groupId === to.groupId) {
        const current = preference.children[from.groupId] ?? [];
        onPreferenceChange({
          ...preference,
          children: {
            ...preference.children,
            [from.groupId]: reorderIds(current, from.index, to.index),
          },
        });
      }
    },
    [onPreferenceChange, preference, topLevelIds],
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/50 leading-relaxed px-1">
        Arraste os itens para definir a ordem do menu. A personalização vale só para o seu usuário neste
        navegador.
      </p>

      <div className="flex flex-col gap-2">
        {topLevelIds.map((id, index) => {
          const item = itemById.get(id);
          if (!item) return null;

          if (item.kind === "link") {
            return (
              <SortableRow
                key={id}
                label={item.label}
                dragIndex={index}
                onDragStart={() => {
                  dragSourceRef.current = { scope: "top", index };
                }}
                onDragOver={() => {}}
                onDrop={() => {
                  const from = dragSourceRef.current;
                  if (from) commitReorder(from, { scope: "top", index });
                  dragSourceRef.current = null;
                }}
              />
            );
          }

          const group = item;
          const childIds = (() => {
            const known = new Set(group.children.map((c) => c.id));
            const ordered = (preference.children[group.id] ?? []).filter((cid) => known.has(cid));
            for (const child of group.children) {
              if (!ordered.includes(child.id)) ordered.push(child.id);
            }
            return ordered;
          })();

          return (
            <div key={id} className="flex flex-col gap-1.5">
              <SortableRow
                label={group.label}
                dragIndex={index}
                onDragStart={() => {
                  dragSourceRef.current = { scope: "top", index };
                }}
                onDragOver={() => {}}
                onDrop={() => {
                  const from = dragSourceRef.current;
                  if (from) commitReorder(from, { scope: "top", index });
                  dragSourceRef.current = null;
                }}
              />
              {childIds.map((childId, childIndex) => {
                const child = group.children.find((c) => c.id === childId);
                if (!child) return null;
                return (
                  <SortableRow
                    key={childId}
                    nested
                    label={child.label}
                    dragIndex={childIndex}
                    onDragStart={() => {
                      dragSourceRef.current = {
                        scope: "child",
                        groupId: group.id,
                        index: childIndex,
                      };
                    }}
                    onDragOver={() => {}}
                    onDrop={() => {
                      const from = dragSourceRef.current;
                      if (from) {
                        commitReorder(from, {
                          scope: "child",
                          groupId: group.id,
                          index: childIndex,
                        });
                      }
                      dragSourceRef.current = null;
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Salvar ordem
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
          >
            Padrão
          </button>
        </div>
      </div>
    </div>
  );
}

export function createDraftPreference(items: (MenuLinkItem | MenuGroupItem)[]): MenuPreference {
  return buildMenuPreferenceFromItems(items);
}
