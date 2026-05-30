"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildRenegociacaoDashboardUrl,
  MODALIDADE_ATALHO_ADITIVO,
} from "@/lib/renegociacao-routes";
import { canAccessContratoRenegociacao } from "@/lib/auth-storage";

/**
 * Rota legada — redireciona para o wizard unificado de renegociação (modalidade T2).
 */
export default function ContratoAditivoRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!canAccessContratoRenegociacao()) {
      router.replace("/dashboard/contratos");
      return;
    }
    const contratoIdRaw = searchParams.get("contratoId");
    const contratoId = contratoIdRaw ? Number(contratoIdRaw) : NaN;
    const hasContrato = Number.isFinite(contratoId) && contratoId > 0;
    router.replace(
      buildRenegociacaoDashboardUrl({
        contratoId: hasContrato ? contratoId : undefined,
        modalidade: hasContrato ? MODALIDADE_ATALHO_ADITIVO : undefined,
      }),
    );
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-5xl p-8 text-center text-sm text-white/50">
      Redirecionando para renegociação…
    </div>
  );
}
