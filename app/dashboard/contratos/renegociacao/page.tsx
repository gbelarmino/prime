"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RenegociacaoWizard } from "@/components/dashboard/RenegociacaoWizard";
import { ContratoRenegociacaoSelecao } from "@/components/dashboard/ContratoRenegociacaoSelecao";
import { canAccessContratoRenegociacao } from "@/lib/auth-storage";
import {
  buildRenegociacaoDashboardUrl,
  parseModalidadeRenegociacao,
} from "@/lib/renegociacao-routes";
import type { ModalidadeRenegociacao } from "@/lib/renegociacao-types";

export default function ContratoRenegociacaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoIdRaw = searchParams.get("contratoId");
  const renegociacaoIdRaw = searchParams.get("renegociacaoId");
  const contratoId = contratoIdRaw ? Number(contratoIdRaw) : NaN;
  const renegociacaoId = renegociacaoIdRaw ? Number(renegociacaoIdRaw) : null;
  const modalidadeInicial: ModalidadeRenegociacao | null = parseModalidadeRenegociacao(
    searchParams.get("modalidade"),
  );
  const hasContrato = Number.isFinite(contratoId) && contratoId > 0;

  useEffect(() => {
    if (!canAccessContratoRenegociacao()) {
      router.replace("/dashboard/contratos");
    }
  }, [router]);

  const voltarHref = hasContrato
    ? buildRenegociacaoDashboardUrl({ modalidade: modalidadeInicial ?? undefined })
    : "/dashboard/contratos";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 px-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col">
          <Link
            href={voltarHref}
            className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-widest text-violet-400 no-underline transition hover:text-violet-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {hasContrato ? "Voltar à seleção" : "Voltar aos contratos"}
          </Link>
          <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-violet-400">
            {hasContrato ? "Renegociação versionada" : "Contratos assinados"}
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
            Renegociação de contrato
          </h1>
          <p className="mt-2 max-w-xl font-medium leading-relaxed text-white/40">
            {hasContrato
              ? modalidadeInicial === "T2_SALDO_DEVEDOR"
                ? "Fluxo unificado — inclui o antigo aditivo de saldo devedor (modalidade T2)."
                : "Simule, formalize e efetive uma nova versão das condições financeiras, preservando o histórico integral do contrato."
              : "Selecione um contrato assinado na tabela para iniciar o processo de renegociação."}
          </p>
        </div>
      </div>

      {hasContrato ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-8">
          <RenegociacaoWizard
            contratoId={contratoId}
            renegociacaoIdInicial={renegociacaoId}
            modalidadeInicial={modalidadeInicial}
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 px-4 delay-100 duration-700">
          <ContratoRenegociacaoSelecao modalidadeInicial={modalidadeInicial} />
        </div>
      )}
    </div>
  );
}
