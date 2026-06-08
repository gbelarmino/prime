"use client";

import { Suspense } from "react";
import { FluxoReceitaDashboard } from "@/components/dashboard/fin/FluxoReceitaDashboard";

export default function FluxoReceitaPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          Gestão Financeira
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Fluxo de receita
        </h1>
        <p className="mt-1 max-w-2xl font-medium leading-relaxed text-white/40">
          Evolução mensal por empreendimento: recebimentos líquidos, emissões, inadimplência e taxas
          bancárias desde o primeiro mês com movimentação.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 delay-100 duration-700">
        <Suspense
          fallback={
            <div className="p-12 text-center font-medium text-white/20 animate-pulse">
              Carregando fluxo de receita…
            </div>
          }
        >
          <FluxoReceitaDashboard />
        </Suspense>
      </div>
    </div>
  );
}
