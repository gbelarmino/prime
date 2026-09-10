"use client";

import { ContratoCanceladoTitulosSaneamentoWorkspace } from "@/components/dashboard/fin/ContratoCanceladoTitulosSaneamentoWorkspace";

export default function SaneamentoTitulosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Saneamento de títulos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Regulariza títulos ainda abertos em contratos já cancelados — com baixa no banco quando
          houver boleto emitido, ou cancelamento só no Aires com observação no histórico.
        </p>
      </div>
      <ContratoCanceladoTitulosSaneamentoWorkspace />
    </div>
  );
}
