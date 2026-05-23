"use client";

import type { ReactNode } from "react";

type WhatsAppSectionShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Conteúdo extra abaixo do painel principal (ex.: callouts). */
  footer?: ReactNode;
  /**
   * `panel` — cartão com gradiente e borda (ex.: modelos).
   * `plain` — cabeçalho + conteúdo sem moldura externa (ex.: lista de gatilhos com cards próprios).
   */
  surface?: "panel" | "plain";
};

/**
 * Envolvente visual alinhada à página de Conexão WhatsApp (barra editorial, cantos, gradiente).
 */
export function WhatsAppSectionShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  footer,
  surface = "panel",
}: WhatsAppSectionShellProps) {
  const header = (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/95">
            {eyebrow}
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-white/45">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );

  const body = <div className={surface === "panel" ? "border-t border-white/[0.06] pt-5" : "pt-2"}>{children}</div>;

  return (
    <div className="w-full min-w-0 space-y-6 py-2">
      {surface === "plain" ? (
        <div className="flex flex-col gap-6">
          {header}
          {body}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#061a2f]/90 via-[#020817]/95 to-[#020817] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400/80 via-emerald-500/40 to-teal-600/30"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.06] blur-3xl" aria-hidden />

          <div className="relative flex flex-col gap-6 px-3 py-5 sm:px-4 sm:py-6">
            {header}
            {body}
          </div>
        </div>
      )}

      {footer}
    </div>
  );
}
