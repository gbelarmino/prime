"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { APP_BRAND_NAME } from "@/lib/app-brand";
import { clearPortalSession, getPortalNome } from "@/lib/portal-auth-storage";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal/parcelas", label: "Parcelas", icon: "pi-calendar" },
  { href: "/portal/contratos", label: "Contratos", icon: "pi-file" },
  { href: "/portal/renegociar", label: "Renegociar", icon: "pi-refresh" },
] as const;

export function PortalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nome = getPortalNome();
  const iniciais = (nome || "A")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  function sair() {
    clearPortalSession();
    router.replace("/portal");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--portal-bg)]">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[var(--portal-border)] bg-[var(--portal-bg-elevated)]">
        <div className="p-5 border-b border-[var(--portal-border)]">
          <div className="flex items-center gap-2.5">
            <AppLogo boxClassName="w-10 h-10" />
            <span className="font-[family-name:var(--font-portal-display)] font-semibold">Minha área</span>
          </div>
        </div>
        <div className="p-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--portal-accent-glow)] text-sm font-semibold text-[var(--portal-accent)]">
            {iniciais}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{nome || "Comprador"}</p>
            <p className="text-xs text-[var(--portal-text-faint)]">Portal {APP_BRAND_NAME}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--portal-radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--portal-accent-glow)] text-[var(--portal-accent)]"
                    : "text-[var(--portal-text-muted)] hover:bg-white/5 hover:text-[var(--portal-text)]"
                )}
              >
                <i className={cn("pi", item.icon, "text-base")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--portal-border)]">
          <button
            type="button"
            onClick={sair}
            className="flex w-full items-center gap-2 rounded-[var(--portal-radius)] px-3 py-2 text-sm text-[var(--portal-text-faint)] hover:bg-white/5 hover:text-[var(--portal-text)]"
          >
            <i className="pi pi-sign-out" aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-[var(--portal-border)] bg-[var(--portal-bg)]/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AppLogo boxClassName="w-9 h-9" />
            <span className="text-sm font-semibold truncate max-w-[140px]">{nome || "Portal"}</span>
          </div>
          <button type="button" onClick={sair} className="text-xs text-[var(--portal-text-faint)]">
            Sair
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 max-w-2xl mx-auto w-full pb-24 lg:pb-8">
          {children}
        </main>

        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-[var(--portal-border)] bg-[var(--portal-bg-elevated)]/95 backdrop-blur-md"
          aria-label="Navegação principal"
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-[var(--portal-accent)]" : "text-[var(--portal-text-faint)]"
                )}
              >
                <i className={cn("pi text-lg", item.icon)} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
