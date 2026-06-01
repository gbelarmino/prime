"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RenegociacoesConsultaList } from "@/components/dashboard/RenegociacoesConsultaList";
import { canAccessContratoRenegociacao } from "@/lib/auth-storage";
import { RENEGOCIACAO_DASHBOARD_PATH } from "@/lib/renegociacao-routes";

export default function RenegociacaoConsultarPage() {
  const router = useRouter();

  useEffect(() => {
    if (!canAccessContratoRenegociacao()) {
      router.replace("/dashboard/contratos");
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 px-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col">
          <Link
            href={RENEGOCIACAO_DASHBOARD_PATH}
            className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-widest text-violet-400 no-underline transition hover:text-violet-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Renegociar
          </Link>
          <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-violet-400">
            Renegociação
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
            Consultar renegociações
          </h1>
          <p className="mt-2 max-w-xl font-medium leading-relaxed text-white/40">
            Listagem de processos de renegociação do tenant, com contrato, modalidade, status e datas.
          </p>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 px-4 pb-8 delay-100 duration-700">
        <RenegociacoesConsultaList />
      </div>
    </div>
  );
}
