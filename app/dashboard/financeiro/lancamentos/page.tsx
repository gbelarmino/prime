"use client";

import { Suspense } from "react";
import { LancamentosList } from "@/components/dashboard/fin/LancamentosList";

export default function LancamentosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
          Gestão Financeira
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Lançamentos contábeis
        </h1>
        <p className="text-white/40 mt-1 max-w-xl leading-relaxed font-medium">
          Partidas dobradas geradas na emissão, liquidação e importação legada de pagamentos.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 px-0">
        <Suspense
          fallback={
            <div className="p-12 text-center text-white/20 font-medium animate-pulse">
              Carregando lançamentos…
            </div>
          }
        >
          <LancamentosList />
        </Suspense>
      </div>
    </div>
  );
}
