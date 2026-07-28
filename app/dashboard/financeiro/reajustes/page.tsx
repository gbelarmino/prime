"use client";

import { ReajustesFilaList } from "@/components/dashboard/fin/ReajustesFilaList";

export default function ReajustesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Reajustes</h1>
        <p className="mt-1 text-sm text-white/50">
          Fila de contratos por mês de aniversário, prontos para gerar o próximo ciclo de até 12
          parcelas com IPCA ou IGP-M fechado.
        </p>
      </div>
      <ReajustesFilaList />
    </div>
  );
}
