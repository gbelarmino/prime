"use client";

import { Suspense } from "react";
import { PlanoContasSaldosList } from "@/components/dashboard/fin/PlanoContasSaldosList";

export default function PlanoContasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          Gestão Financeira
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Plano de contas
        </h1>
        <p className="mt-1 max-w-xl font-medium leading-relaxed text-white/40">
          Saldos por conta contábil com totais de débito, crédito e saldo conforme a natureza da conta.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 px-0 delay-100 duration-700">
        <Suspense
          fallback={
            <div className="p-12 text-center font-medium text-white/20 animate-pulse">
              Carregando saldos…
            </div>
          }
        >
          <PlanoContasSaldosList />
        </Suspense>
      </div>
    </div>
  );
}
