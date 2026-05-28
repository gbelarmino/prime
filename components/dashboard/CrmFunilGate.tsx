"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Kanban } from "lucide-react";
import Link from "next/link";
import { isAdmin, ADMIN_DASHBOARD_HOME } from "@/lib/auth-storage";
import { isCrmFunilEnabled } from "@/lib/crm-service";

type GateState = "loading" | "denied_role" | "disabled" | "ready";

type CrmFunilGateProps = {
  children: ReactNode;
  loadingLabel?: string;
};

export function CrmFunilGate({ children, loadingLabel = "Abrindo funil" }: CrmFunilGateProps) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    if (!isAdmin()) {
      setState("denied_role");
      router.replace(ADMIN_DASHBOARD_HOME);
      return;
    }
    let cancelled = false;
    void isCrmFunilEnabled()
      .then((ok) => {
        if (cancelled) return;
        setState(ok ? "ready" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setState("disabled");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "loading" || state === "denied_role") {
    return (
      <div className="flex h-[calc(100vh-var(--dashboard-header-offset,4rem))] flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400/90" strokeWidth={2} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">
          {loadingLabel}
        </span>
      </div>
    );
  }

  if (state === "disabled") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
          <Kanban size={28} aria-hidden />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold text-white">Funil CRM indisponível</h1>
          <p className="text-sm text-white/55">
            O módulo CRM não está habilitado para esta organização. Troque de tenant ou peça ao
            administrador para ativar a feature <code className="text-white/70">CRM_FUNIL</code>.
          </p>
        </div>
        <Link
          href={ADMIN_DASHBOARD_HOME}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 no-underline transition-colors hover:bg-white/10"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
