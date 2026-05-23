"use client";

import { Suspense } from "react";
import { ConciliacaoDiariaWorkspace } from "@/components/dashboard/fin/ConciliacaoDiariaWorkspace";

export default function ConciliacaoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
          Gestão Financeira
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Conciliação diária
        </h1>
        <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
          Confronte pagamentos registrados no sistema com o extrato bancário, trate divergências e feche o dia com
          relatório auditável.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <Suspense
          fallback={
            <div className="p-12 text-center text-white/20 font-medium animate-pulse">
              Carregando conciliação…
            </div>
          }
        >
          <ConciliacaoDiariaWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
