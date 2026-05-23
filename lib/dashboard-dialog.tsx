import type { DialogPassThroughOptions } from "primereact/dialog";

/** Máscara padrão dos modais do painel (blur + escurecimento). */
export const DASHBOARD_DIALOG_MASK_PT = {
  className: "backdrop-blur-sm bg-black/40",
} as const;

export const DASHBOARD_DIALOG_PT_BASE: DialogPassThroughOptions = {
  mask: DASHBOARD_DIALOG_MASK_PT,
};

/** Mescla pt local com máscara padrão. */
export function dashboardDialogPt(
  pt?: DialogPassThroughOptions,
): DialogPassThroughOptions {
  if (!pt) return DASHBOARD_DIALOG_PT_BASE;
  return {
    ...DASHBOARD_DIALOG_PT_BASE,
    ...pt,
    mask: { ...DASHBOARD_DIALOG_MASK_PT, ...pt.mask },
    header: pt.header
      ? { ...(DASHBOARD_DIALOG_PT_BASE.header as object), ...pt.header }
      : DASHBOARD_DIALOG_PT_BASE.header,
    content: pt.content
      ? { ...(DASHBOARD_DIALOG_PT_BASE.content as object), ...pt.content }
      : DASHBOARD_DIALOG_PT_BASE.content,
    footer: pt.footer
      ? { ...(DASHBOARD_DIALOG_PT_BASE.footer as object), ...pt.footer }
      : DASHBOARD_DIALOG_PT_BASE.footer,
  };
}
