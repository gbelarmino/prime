"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function formatPortalMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPortalDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isPortalParcelaPaga(status: string) {
  const s = status.toUpperCase();
  return s === "PAGO" || s === "PAGA";
}

export function isPortalVencimentoPassado(vencimento: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento + "T12:00:00");
  v.setHours(0, 0, 0, 0);
  return v.getTime() < hoje.getTime();
}

export function portalVencimentoTexto(vencimento: string) {
  const data = formatPortalDate(vencimento);
  return isPortalVencimentoPassado(vencimento) ? `Venceu em ${data}` : `Vence em ${data}`;
}

export function portalStatusLabel(status: string, vencido?: boolean) {
  if (isPortalParcelaPaga(status)) return { label: "Paga", tone: "success" as const };
  if (vencido) return { label: "Vencida", tone: "danger" as const };
  const s = status.toUpperCase();
  if (s === "PAGO") return { label: "Paga", tone: "success" as const };
  if (s === "VENCIDO") return { label: "Vencida", tone: "danger" as const };
  if (s === "EMITIDO" || s === "REGISTRADO") return { label: "Em aberto", tone: "neutral" as const };
  return { label: status, tone: "neutral" as const };
}

const toneStyles = {
  danger: "bg-[var(--portal-danger-bg)] text-[var(--portal-danger)] border-[var(--portal-danger)]/25",
  success: "bg-[var(--portal-success-bg)] text-[var(--portal-success)] border-[var(--portal-success)]/25",
  neutral: "bg-white/5 text-[var(--portal-text-muted)] border-[var(--portal-border)]",
  accent: "bg-[var(--portal-accent-glow)] text-[var(--portal-accent)] border-[var(--portal-accent)]/30",
};

export function PortalBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneStyles;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  );
}

export function PortalAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info" | "warn";
  children: React.ReactNode;
}) {
  const map = {
    error: "border-[var(--portal-danger)]/30 bg-[var(--portal-danger-bg)] text-[var(--portal-danger)]",
    success: "border-[var(--portal-success)]/30 bg-[var(--portal-success-bg)] text-[var(--portal-success)]",
    info: "border-blue-400/25 bg-[var(--portal-info-bg)] text-blue-200",
    warn: "border-[var(--portal-accent)]/35 bg-[var(--portal-accent-glow)] text-[var(--portal-accent)]",
  };
  const icon = { error: "pi-times-circle", success: "pi-check-circle", info: "pi-info-circle", warn: "pi-exclamation-triangle" };
  return (
    <div className={cn("flex gap-3 rounded-[var(--portal-radius)] border px-4 py-3 text-sm", map[tone])} role="alert">
      <i className={cn("pi mt-0.5 shrink-0", icon[tone])} aria-hidden />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function PortalSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--portal-radius)] bg-white/8", className)} />;
}

export function PortalEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 rounded-[var(--portal-radius-lg)] border border-dashed border-[var(--portal-border)] bg-[var(--portal-surface)]/50">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--portal-accent-glow)] text-[var(--portal-accent)] mb-4">
        <i className={cn("pi text-2xl", icon)} aria-hidden />
      </span>
      <h3 className="font-[family-name:var(--font-portal-display)] text-lg font-semibold text-[var(--portal-text)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--portal-text-muted)] max-w-xs">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function PortalPageHeader({
  title,
  description,
  backHref,
  backLabel = "Voltar",
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="portal-animate-in mb-6">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--portal-accent)] hover:opacity-90 mb-3"
        >
          <i className="pi pi-arrow-left text-xs" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <h1 className="font-[family-name:var(--font-portal-display)] text-2xl font-semibold tracking-tight text-[var(--portal-text)]">
        {title}
      </h1>
      {description ? (
        <p className="mt-1.5 text-sm text-[var(--portal-text-muted)] leading-relaxed">{description}</p>
      ) : null}
    </header>
  );
}

export function PortalField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--portal-text)]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-[var(--portal-text-faint)]">{hint}</p> : null}
    </div>
  );
}

export function PortalCard({
  children,
  className,
  as: Tag = "div",
  href,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article";
  href?: string;
  onClick?: () => void;
}) {
  const base = cn(
    "rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-4 transition-colors",
    href || onClick ? "hover:border-[var(--portal-border-strong)] hover:bg-[var(--portal-surface-hover)] cursor-pointer" : "",
    className
  );
  if (href) {
    return (
      <Link href={href} className={cn("block", base)}>
        {children}
      </Link>
    );
  }
  return <Tag className={base} onClick={onClick}>{children}</Tag>;
}

export function PortalStepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6" aria-label={`Passo ${step} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i < step ? "bg-[var(--portal-accent)]" : "bg-white/10"
          )}
        />
      ))}
    </div>
  );
}
