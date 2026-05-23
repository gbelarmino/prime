"use client";

import { Suspense } from "react";
import { ImovelFinanceiroList } from "@/components/dashboard/fin/ImovelFinanceiroList";

export default function PorImovelPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          Gestão Financeira
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Financeiro por imóvel
        </h1>
        <p className="mt-1 max-w-xl font-medium leading-relaxed text-white/40">
          Resumo consolidado de recebimentos, pagamentos e lançamentos contábeis por unidade.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 px-0 duration-700 delay-100">
        <Suspense
          fallback={
            <div className="animate-pulse p-12 text-center font-medium text-white/20">
              Carregando imóveis…
            </div>
          }
        >
          <ImovelFinanceiroList />
        </Suspense>
      </div>
    </div>
  );
}
