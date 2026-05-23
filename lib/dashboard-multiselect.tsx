import type { MultiSelectPassThroughOptions } from "primereact/multiselect";

/** Pass-through padrão do PrimeReact MultiSelect no painel Aires. */
export function dashboardMultiSelectPt(): MultiSelectPassThroughOptions {
  return {
    root: { className: "w-full" },
    labelContainer: {
      className:
        "flex min-h-[2.75rem] w-full items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5",
    },
    label: { className: "text-sm text-white" },
    token: {
      className:
        "inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/10 py-0.5 pl-2.5 pr-1.5 text-xs text-white",
    },
    tokenLabel: { className: "min-w-0 truncate" },
    removeTokenIcon: {
      className:
        "m-0 shrink-0 cursor-pointer text-[var(--red-400)] transition-colors hover:text-[var(--red-500)]",
    },
    trigger: { className: "text-white/50" },
    panel: { className: "border-white/10 bg-[#0f1419]" },
    item: { className: "text-white" },
  };
}
