"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { Loader2, Menu, RefreshCw, Save, Search, Zap } from "lucide-react";
import {
  permissoesService,
  type PermissionItem,
} from "@/lib/permissions-service";
import { usePermissions } from "@/lib/permissions-context";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
  dashboardCellMono,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { STAFF_ROLES } from "@/lib/permissions-catalog";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ADMINISTRATIVO: "Administrativo",
  CORRETOR: "Corretor",
  IMOBILIARIA: "Imobiliária",
  ATENDIMENTO: "Atendimento",
};

const GROUP_TONES: Record<string, string> = {
  MENU: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  ACTION: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  ROUTE: "border-violet-500/25 bg-violet-500/10 text-violet-300",
};

const GROUP_LABELS: Record<string, string> = {
  MENU: "Menu",
  ACTION: "Ação",
  ROUTE: "Rota",
};

const STATUS_TONES: Record<string, string> = {
  DEFAULTS: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  CUSTOM: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  DIRTY: "border-rose-500/25 bg-rose-500/10 text-rose-300",
};

const EDITABLE_ROLES = STAFF_ROLES.filter((r) => r !== "ADMIN");
const PAGE_SIZE = 15;

const DROPDOWN_PT = {
  root: { className: "h-[42px] items-center px-2" },
  input: { className: "text-white/70 text-sm" },
  trigger: { className: "text-white/30" },
  panel: { className: "bg-[#1a1a1a] border-white/10 rounded-2xl shadow-2xl p-2" },
  item: ({ context }: { context?: { selected?: boolean } }) => ({
    className: cn(
      "rounded-xl transition-all mb-1 last:mb-0 text-sm py-2.5 px-4",
      context?.selected
        ? "bg-blue-600 text-white"
        : "text-white/60 hover:bg-white/5 hover:text-white",
    ),
  }),
};

type GrantMap = Record<string, Set<string>>;

function toGrantMap(grants: Record<string, string[]>): GrantMap {
  const out: GrantMap = {};
  for (const [role, keys] of Object.entries(grants)) {
    out[role] = new Set(Array.isArray(keys) ? keys : []);
  }
  return out;
}

function fromGrantMap(map: GrantMap): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [role, keys] of Object.entries(map)) {
    out[role] = [...keys].sort();
  }
  return out;
}

function cloneGrantMap(map: GrantMap): GrantMap {
  const out: GrantMap = {};
  for (const [role, keys] of Object.entries(map)) {
    out[role] = new Set(keys);
  }
  return out;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}

/** Menus: qualquer staff. Ações: só apiCapableRoles (piso HTTP). Admin nunca editável. */
function isGrantEditable(item: PermissionItem, role: string): boolean {
  if (role === "ADMIN") return false;
  if (item.group !== "ACTION") return true;
  if (!item.apiCapableRoles?.length) return true;
  return item.apiCapableRoles.includes(role);
}

export function PermissoesMatriz() {
  const { refresh: refreshMyPermissions } = usePermissions();
  const [items, setItems] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [grants, setGrants] = useState<GrantMap>({});
  const [baseline, setBaseline] = useState<GrantMap>({});
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogo, matriz] = await Promise.all([
        permissoesService.catalogo(),
        permissoesService.matriz(),
      ]);
      setItems(catalogo.items ?? []);
      setRoles((catalogo.roles ?? []).filter((r) => r !== "COMPRADOR"));
      const map = toGrantMap(matriz.grants ?? {});
      map.ADMIN = new Set((catalogo.items ?? []).map((i) => i.key));
      setGrants(map);
      setBaseline(cloneGrantMap(map));
      setUsingDefaults(Boolean(matriz.usingDefaults));
      setPage(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar permissões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    for (const role of EDITABLE_ROLES) {
      if (!setsEqual(grants[role] ?? new Set(), baseline[role] ?? new Set())) {
        return true;
      }
    }
    return false;
  }, [grants, baseline]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (groupFilter && item.group !== groupFilter) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, groupFilter]);

  useEffect(() => {
    setPage(0);
  }, [search, groupFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const toggle = useCallback((role: string, key: string, nextChecked: boolean) => {
    if (role === "ADMIN") return;
    setGrants((prev) => {
      const next = cloneGrantMap(prev);
      if (!next[role]) next[role] = new Set();
      if (nextChecked) next[role].add(key);
      else next[role].delete(key);
      return next;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = fromGrantMap(grants);
      payload.ADMIN = items.map((i) => i.key);
      const saved = await permissoesService.salvarMatriz(payload);
      const map = toGrantMap(saved.grants ?? {});
      map.ADMIN = new Set(items.map((i) => i.key));
      setGrants(map);
      setBaseline(cloneGrantMap(map));
      setUsingDefaults(Boolean(saved.usingDefaults));
      await refreshMyPermissions();
      toast.success("Matriz de permissões salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    setSaving(true);
    try {
      const saved = await permissoesService.restaurarDefaults();
      const map = toGrantMap(saved.grants ?? {});
      map.ADMIN = new Set(items.map((i) => i.key));
      setGrants(map);
      setBaseline(cloneGrantMap(map));
      setUsingDefaults(true);
      await refreshMyPermissions();
      toast.success("Defaults restaurados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar");
    } finally {
      setSaving(false);
    }
  };

  const displayRoles = useMemo(() => {
    const list = roles.length ? roles : [...STAFF_ROLES];
    return list.filter((r) => r !== "COMPRADOR");
  }, [roles]);

  const groupOptions = [
    { label: "Todos os grupos", value: null },
    { label: "Menus", value: "MENU" },
    { label: "Ações", value: "ACTION" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          outlined
          loading={saving}
          onClick={() => void restore()}
          className="border-white/15 bg-transparent px-5 py-3 text-white/70 hover:border-white/25 hover:bg-white/5 hover:text-white"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <RefreshCw size={14} />
            Restaurar defaults
          </span>
        </Button>
        <Button
          type="button"
          loading={saving}
          disabled={!dirty}
          onClick={() => void save()}
          className={cn(
            "rounded-full border-none px-8 py-4 shadow-2xl transition-all active:scale-95",
            dirty
              ? "bg-amber-600 shadow-amber-600/30 hover:bg-amber-500"
              : "bg-white/10 text-white/40 shadow-none",
          )}
        >
          <span className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
            <Save size={16} />
            Salvar matriz
          </span>
        </Button>
      </div>

      <DashboardDataTableShell>
        <div className="border-b border-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center lg:w-auto">
              <div className="relative w-full md:w-96">
                <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
                <InputText
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou chave..."
                  className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
                />
              </div>
              <Dropdown
                value={groupFilter}
                options={groupOptions}
                optionValue="value"
                onChange={(e) => setGroupFilter(e.value)}
                placeholder="Grupo"
                className="w-full rounded-full border-white/10 bg-white/5 text-sm md:w-48"
                pt={DROPDOWN_PT}
              />
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {usingDefaults
                  ? dashboardStatusBadge("Defaults", STATUS_TONES, "DEFAULTS")
                  : dashboardStatusBadge("Personalizada", STATUS_TONES, "CUSTOM")}
                {dirty ? dashboardStatusBadge("Não salvas", STATUS_TONES, "DIRTY") : null}
              </div>
              <div className="text-sm text-white/40">
                <span className="font-bold text-white">{filteredItems.length}</span>
                {filteredItems.length === 1 ? " permissão" : " permissões"}
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          {loading ? (
            <div className="flex min-h-[20rem] items-center justify-center text-blue-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pageItems.length === 0 ? (
            <div className="px-6 py-10 text-sm text-white/40">
              {search || groupFilter
                ? "Nenhuma permissão corresponde aos filtros."
                : "Nenhuma permissão no catálogo."}
            </div>
          ) : (
            <table className="w-full min-w-[64rem] border-collapse">
              <thead className="bg-[#0B1A2E]">
                <tr>
                  <th className="border-b border-white/5 px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Grupo
                  </th>
                  <th className="border-b border-white/5 px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Permissão
                  </th>
                  {displayRoles.map((role) => (
                    <th
                      key={role}
                      className="border-b border-white/5 px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/40"
                    >
                      {ROLE_LABELS[role] ?? role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const isAction = row.group === "ACTION";
                  const Icon = isAction ? Zap : Menu;
                  return (
                    <tr
                      key={row.key}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 align-middle">
                        {dashboardStatusBadge(
                          GROUP_LABELS[row.group] ?? row.group,
                          GROUP_TONES,
                          row.group,
                        )}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                              isAction
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-blue-500/10 text-blue-400",
                            )}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-semibold leading-tight text-white">
                              {row.label}
                            </span>
                            {dashboardCellMono(row.key, { truncate: true })}
                            {row.description ? (
                              <span
                                className="truncate text-[11px] text-white/35"
                                title={row.description}
                              >
                                {row.description}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {displayRoles.map((role) => {
                        const editable = isGrantEditable(row, role);
                        const checked =
                          role === "ADMIN" ? true : Boolean(grants[role]?.has(row.key));
                        const inputId = `perm-${role}-${row.key}`;
                        return (
                          <td key={role} className="px-4 py-4 text-center align-middle">
                            <div
                              className="inline-flex items-center justify-center"
                              title={
                                role === "ADMIN"
                                  ? "Admin tem acesso total"
                                  : !editable
                                    ? "Ação fora do piso de API deste perfil"
                                    : undefined
                              }
                            >
                              <Checkbox
                                inputId={inputId}
                                checked={checked}
                                disabled={!editable || saving}
                                onChange={(e) => {
                                  if (!editable || saving) return;
                                  // PrimeReact envia o valor *novo* em e.checked
                                  toggle(role, row.key, e.checked === true);
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredItems.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/5 p-6">
            <span className="text-xs text-white/35">
              Página {page + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-10 w-10 rounded-xl bg-white/5 text-sm font-bold text-white/60 transition hover:bg-blue-600 hover:text-white disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="h-10 w-10 rounded-xl bg-white/5 text-sm font-bold text-white/60 transition hover:bg-blue-600 hover:text-white disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </DashboardDataTableShell>

      <p className="max-w-3xl px-1 text-xs leading-relaxed text-white/35">
        O perfil Admin tem acesso total e não pode ser desmarcado. Menus podem ser
        concedidos ou retirados a qualquer perfil staff; ações só aceitam perfis que a
        API já autoriza. Alterações entram em vigor após salvar.
      </p>
    </div>
  );
}
