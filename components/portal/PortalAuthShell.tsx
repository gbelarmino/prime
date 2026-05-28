"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { APP_BRAND_NAME } from "@/lib/app-brand";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: "pi-wallet", text: "PIX, linha digitável e boleto em PDF na hora" },
  { icon: "pi-file-pdf", text: "Contratos assinados sempre à mão" },
  { icon: "pi-sync", text: "Renegocie parcelas vencidas em minutos" },
] as const;

type PortalAuthShellProps = {
  children: React.ReactNode;
  badge?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
};

export function PortalAuthShell({
  children,
  badge = "Acesso seguro",
  title = "Entre na sua conta",
  subtitle = "Use seu CPF e o código enviado ao celular cadastrado.",
  footer,
}: PortalAuthShellProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--portal-bg)]">
      <aside className="portal-grain portal-lot-grid relative flex flex-col justify-between px-8 py-10 lg:px-12 lg:py-14 lg:w-[min(54%,600px)] lg:min-h-screen border-b lg:border-b-0 lg:border-r border-[var(--portal-border)] bg-[var(--portal-bg-elevated)]">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo boxClassName="w-12 h-12 ring-2 ring-[var(--portal-accent)]/30 rounded-xl" />
            <div>
              <span className="block text-sm font-semibold leading-snug text-[var(--portal-text)]">
                {APP_BRAND_NAME}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--portal-text-faint)]">
                Portal do comprador
              </span>
            </div>
          </div>
          <Link
            href="/login"
            className="hidden sm:inline text-xs text-[var(--portal-text-faint)] hover:text-[var(--portal-accent)] transition-colors"
          >
            Admin →
          </Link>
        </div>

        <div className="relative z-10 my-12 lg:my-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center max-w-md">
          <p className="text-[var(--portal-accent)] text-sm font-medium mb-4">Seu lote, suas finanças</p>
          <h1 className="font-[family-name:var(--font-portal-display)] text-3xl lg:text-[2.35rem] font-semibold text-[var(--portal-text)] leading-[1.12]">
            Tudo o que importa sobre o seu imóvel, num só lugar.
          </h1>
          <p className="mt-4 text-[15px] text-[var(--portal-text-muted)] leading-relaxed">
            Parcelas, contratos e renegociação com a mesma seriedade do escritório — sem filas,
            sem ligações repetidas.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent-glow)] text-[var(--portal-accent)]">
                  <i className={cn("pi", f.icon)} aria-hidden />
                </span>
                <span className="text-sm text-[var(--portal-text-muted)] pt-1.5 leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-[var(--portal-text-faint)]">
          © {year} {APP_BRAND_NAME}
        </p>
      </aside>

      <main className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div
          className="portal-animate-in w-full max-w-[440px] mx-auto rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-6 sm:p-8 shadow-[var(--portal-shadow)]"
          style={{ animationDelay: "0.08s" }}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--portal-accent)] mb-2">{badge}</p>
          <h2 className="font-[family-name:var(--font-portal-display)] text-2xl font-semibold text-[var(--portal-text)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm text-[var(--portal-text-muted)] leading-relaxed">{subtitle}</p>
          ) : null}

          <div className="mt-7">{children}</div>

          {footer ?? (
            <p className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[var(--portal-text-faint)]">
              <i className="pi pi-lock text-[10px]" aria-hidden />
              Conexão criptografada (SSL)
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
