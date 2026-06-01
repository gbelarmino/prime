import type { MouseEvent, ReactNode } from "react";
import { Button } from "primereact/button";
import type { MenuItem } from "primereact/menuitem";
import { cn } from "@/lib/utils";

/** Classe CSS do PrimeReact DataTable no painel Aires. */
export const DASHBOARD_DATATABLE_CLASS = "p-datatable-custom";

/** Campo de busca compacto (filtros em card; ícone left-3, 16px). */
export const DASHBOARD_SEARCH_INPUT_COMPACT_CLASS =
  "w-full border-white/10 bg-white/[0.05] py-2.5 pl-11 pr-3 text-xs text-white placeholder:text-white/25";

/** Campo de busca no header de listas (ícone left-4, 18px). */
export const DASHBOARD_SEARCH_INPUT_HEADER_CLASS =
  "w-full rounded-full border-white/10 bg-white/5 py-3 pl-14 pr-4 text-sm text-white placeholder:text-white/25";

/** Ícone de lupa — filtros compactos. */
export const DASHBOARD_SEARCH_ICON_COMPACT_CLASS =
  "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-white/30";

/** Ícone de lupa — header de listas. */
export const DASHBOARD_SEARCH_ICON_HEADER_CLASS =
  "pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/30";

/** Botão ⋯ da coluna Ações. */
export const DASHBOARD_ACTIONS_BUTTON_CLASS =
  "p-button-rounded p-button-text text-amber-400 hover:bg-amber-400/10 transition-all active:scale-90";

/** Pass-through do Menu popup de ações por linha. */
export function dashboardActionsMenuPt() {
  return {
    root: {
      className: "w-max rounded-xl border border-white/10 bg-[#071C33] py-2 shadow-2xl",
    },
    menu: { className: "p-0" },
    menuitem: { className: "transition-all duration-200" },
    action: { className: "flex items-center px-0 py-0 no-underline" },
    separator: { className: "my-1 border-white/10" },
  };
}

export type DashboardActionMenuItemOptions = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  labelClassName?: string;
  disabled?: boolean;
};

/** Item do menu de ações (template unificado do dashboard). */
export function dashboardActionMenuItem({
  label,
  onClick,
  icon,
  labelClassName = "text-white/70",
  disabled = false,
}: DashboardActionMenuItemOptions): MenuItem {
  if (disabled) {
    return {
      label,
      template: () => (
        <div className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-3 opacity-30">
          {icon}
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {label}
          </span>
        </div>
      ),
    };
  }

  return {
    label,
    template: (item: MenuItem) => (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
      >
        {icon}
        <span
          className={cn(
            "whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest",
            labelClassName,
          )}
        >
          {item.label ?? label}
        </span>
      </button>
    ),
  };
}

export function dashboardActionMenuSeparator(): MenuItem {
  return { separator: true };
}

/** Célula da coluna Ações com botão ⋯. */
export function dashboardRowActionsCell(
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void,
) {
  return (
    <div className="flex justify-end">
      <Button
        icon="pi pi-ellipsis-h"
        className={DASHBOARD_ACTIONS_BUTTON_CLASS}
        onClick={onToggle}
        tooltip="Ações"
        tooltipOptions={{ position: "left" }}
      />
    </div>
  );
}

/** Contentor padrão (listas principais: Clientes, Imobiliárias, Fila, etc.). */
export const DASHBOARD_DATATABLE_SHELL_CLASS =
  "overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl";

/** Contentor compacto dentro de cards (ex.: WhatsApp teste eventos). */
export const DASHBOARD_DATATABLE_INSET_SHELL_CLASS =
  "overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.01]";

export type DashboardDataTableDensity = "default" | "compact";

export type DashboardDataTablePtOptions = {
  density?: DashboardDataTableDensity;
  /** Inclui estilos do paginador (default: true). */
  paginator?: boolean;
};

/**
 * Pass-through (pt) unificado para PrimeReact DataTable no dashboard.
 * Usar com `className={DASHBOARD_DATATABLE_CLASS}` e, quando aplicável, `DashboardDataTableShell`.
 */
export function dashboardDataTablePt(options: DashboardDataTablePtOptions = {}) {
  const density = options.density ?? "default";
  const withPaginator = options.paginator !== false;

  const cellPy = density === "compact" ? "py-3.5" : "py-4";
  const cellPx = density === "compact" ? "px-4" : "px-6";
  const headerPy = density === "compact" ? "py-3" : "py-4";
  const edgePad = density === "compact" ? "first:pl-5 last:pr-5" : "first:pl-6 last:pr-6";
  const paginatorPad = density === "compact" ? "p-4" : "p-6";
  const pageBtnSize = density === "compact" ? "h-9 w-9" : "h-10 w-10";
  const pageBtnRadius = density === "compact" ? "rounded-lg" : "rounded-xl";

  const pt: Record<string, unknown> = {
    root: { className: "border-none bg-transparent min-w-0" },
    table: { className: "w-full bg-transparent table-fixed" },
    thead: { className: "bg-white/5" },
    headerRow: { className: "bg-transparent" },
    bodyRow: {
      className:
        "border-white/5 bg-transparent transition-colors hover:bg-white/[0.02] group",
    },
    column: {
      headerCell: {
        className: cn(
          "border-white/5 bg-transparent font-bold text-[10px] uppercase tracking-widest text-white/40",
          headerPy,
          cellPx,
          edgePad,
        ),
      },
      bodyCell: {
        className: cn(
          "border-white/5 align-middle text-[13px] leading-snug text-white/80",
          cellPy,
          cellPx,
          edgePad,
        ),
      },
    },
    emptyMessage: {
      className: "bg-transparent py-10 text-sm text-white/40",
    },
    loadingIcon: {
      className: "text-blue-400",
    },
  };

  if (withPaginator) {
    pt.paginator = {
      root: { className: cn("border-white/5 bg-transparent", paginatorPad) },
      pages: { className: "flex gap-1.5" },
      pageButton: ({ context }: { context?: { active?: boolean } }) => ({
        className: cn(
          "flex items-center justify-center border-none font-bold transition-all",
          pageBtnSize,
          pageBtnRadius,
          context?.active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
            : "bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white",
        ),
      }),
      firstPageButton: { className: "text-white/50 hover:text-white" },
      prevPageButton: { className: "text-white/50 hover:text-white" },
      nextPageButton: { className: "text-white/50 hover:text-white" },
      lastPageButton: { className: "text-white/50 hover:text-white" },
    };
  }

  return pt;
}

/** Célula de texto com truncagem e tooltip. */
export function dashboardCellText(
  value: string | null | undefined,
  options?: { mono?: boolean; title?: string },
) {
  const v = value?.trim() || "—";
  return (
    <span
      className={cn(
        "block truncate",
        options?.mono
          ? "font-mono text-[12px] tabular-nums tracking-tight text-white/70"
          : "text-white/85",
      )}
      title={options?.title ?? (v !== "—" ? v : undefined)}
    >
      {v}
    </span>
  );
}

/** Célula monoespaçada; use `truncate` para IDs longos (ex.: beneficiário Unicred). */
export function dashboardCellMono(
  value: string | null | undefined,
  options?: { size?: "default" | "parcela"; truncate?: boolean },
) {
  const v = value?.trim();
  if (!v) return <span className="text-white/30">—</span>;
  const textSize = options?.size === "parcela" ? "text-[15.6px]" : "text-[12px]";
  return (
    <span
      className={cn(
        "block font-mono tabular-nums tracking-tight text-white/70",
        textSize,
        options?.truncate
          ? "min-w-0 max-w-full truncate"
          : "whitespace-nowrap",
      )}
      title={v}
    >
      {v}
    </span>
  );
}

/** Badge de status (PENDENTE, SUCESSO, etc.). */
export function dashboardStatusBadge(
  status: string,
  toneMap: Record<string, string>,
  /** Chave do mapa quando difere do texto exibido (ex.: rótulo PT + código enum). */
  toneKey?: string,
) {
  const key = toneKey ?? status;
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        toneMap[key] ?? "border-white/10 bg-white/10 text-white/50",
      )}
    >
      {status}
    </span>
  );
}

/** Mapa de cores para status da fila WhatsApp. */
export const WHATSAPP_FILA_STATUS_TONES: Record<string, string> = {
  PENDENTE: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  ENVIANDO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  SUCESSO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  ERRO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  CANCELADO: "border-white/15 bg-white/10 text-white/45",
};

/** Classe CSS do PrimeReact TabView no painel Aires. */
export const DASHBOARD_TABVIEW_CLASS = "dashboard-tabview";

export type DashboardTabHeaderVariant = "default" | "danger" | "success";

/** Cabeçalho de aba estilo botão (rótulo + contador). */
export function dashboardTabHeader(
  label: string,
  count: number,
  icon?: ReactNode,
  variant: DashboardTabHeaderVariant = "default",
) {
  return (
    <span
      className={cn(
        "dashboard-tab-header inline-flex items-center gap-3",
        variant === "danger" && "dashboard-tab-header--danger",
        variant === "success" && "dashboard-tab-header--success",
      )}
    >
      {icon ? (
        <span className="dashboard-tab-header-icon inline-flex shrink-0 [&>svg]:size-[18px]">
          {icon}
        </span>
      ) : null}
      <span className="dashboard-tab-header-label text-[13px] font-semibold normal-case tracking-normal">
        {label}
      </span>
      <span className="dashboard-tab-header-badge inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2 py-0.5 text-[14.3px] font-bold tabular-nums">
        {count}
      </span>
    </span>
  );
}

/**
 * Pass-through (pt) unificado para PrimeReact TabView no dashboard.
 * Usar com `className={DASHBOARD_TABVIEW_CLASS}` dentro de card/shell.
 */
export function dashboardTabViewPt() {
  return {
    root: { className: "border-none bg-transparent" },
    navContainer: { className: "mb-2 bg-transparent" },
    navContent: { className: "overflow-visible bg-transparent" },
    nav: {
      className:
        "inline-flex max-w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2",
    },
    inkbar: { className: "!hidden" },
    panelContainer: { className: "bg-transparent px-0 pb-0 pt-5" },
    tab: {
      header: { className: "mr-0 shrink-0" },
      headerAction: { className: "dashboard-tabview-nav-link" },
      headerTitle: { className: "leading-none" },
      content: { className: "border-none bg-transparent p-0" },
    },
  };
}
