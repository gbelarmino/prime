"use client";

import { Suspense } from "react";
import { UnicredWebhookConciliacaoWorkspace } from "@/components/dashboard/fin/UnicredWebhookConciliacaoWorkspace";

export default function UnicredWebhookConciliacaoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          Gestão Financeira
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Webhooks Unicred
        </h1>
        <p className="mt-1 max-w-2xl font-medium leading-relaxed text-white/40">
          Liquidações recebidas do Unicred sem título correspondente no sistema. Vincule a uma parcela
          existente ou crie um título retroativo. Instruções e outros movimentos são processados
          automaticamente e não aparecem nesta fila.
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <Suspense
          fallback={
            <div className="animate-pulse p-12 text-center font-medium text-white/20">
              Carregando fila…
            </div>
          }
        >
          <UnicredWebhookConciliacaoWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
