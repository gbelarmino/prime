import type { MultiSelectPassThroughOptions } from "primereact/multiselect";

/**
 * Pass-through padrão do PrimeReact MultiSelect no painel Aires.
 *
 * Chrome visual fica no `root` (não no labelContainer) para o `clearIcon`
 * absoluto alinhar com o trigger — evita o X sobrepondo a borda.
 */
export function dashboardMultiSelectPt(): MultiSelectPassThroughOptions {
  return {
    root: {
      className:
        "relative inline-flex w-full min-h-[2.75rem] items-center rounded-xl border border-white/15 bg-white/[0.04] transition-[border-color,box-shadow] duration-150 hover:border-white/25 focus-within:border-sky-400/60 focus-within:shadow-[0_0_0_2px_rgba(56,189,248,0.18)]",
    },
    labelContainer: {
      className: "flex min-w-0 flex-1 items-center overflow-hidden",
    },
    label: {
      className:
        "flex min-h-[2.75rem] w-full flex-wrap items-center gap-1.5 px-3 py-1.5 text-sm text-white/90",
    },
    token: {
      className:
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.08] py-0.5 pl-2.5 pr-1 text-[11px] font-medium tracking-wide text-white/85",
    },
    tokenLabel: { className: "min-w-0 truncate" },
    removeTokenIcon: {
      className:
        "m-0 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-white/35 transition-colors hover:bg-white/10 hover:text-white/80",
    },
    clearIcon: {
      className:
        "absolute right-10 top-1/2 z-[1] -mt-2 flex h-4 w-4 cursor-pointer items-center justify-center text-white/35 transition-colors hover:text-white/75",
    },
    trigger: {
      className:
        "flex h-[2.75rem] w-10 shrink-0 items-center justify-center text-white/40 transition-colors hover:text-white/70",
    },
    triggerIcon: { className: "h-3.5 w-3.5" },
    panel: {
      className:
        "mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#0f1419] shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
    },
    header: {
      className: "border-b border-white/10 bg-white/[0.03] px-2 py-2",
    },
    filterContainer: { className: "w-full" },
    filterInput: {
      className:
        "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35",
    },
    item: {
      className:
        "mx-1 rounded-lg px-2 py-2 text-sm text-white/85 transition-colors hover:bg-white/[0.06]",
    },
    emptyMessage: { className: "px-3 py-3 text-sm text-white/45" },
  };
}
