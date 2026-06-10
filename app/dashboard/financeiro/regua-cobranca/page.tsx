"use client";

import { CobrancaReguaConfig } from "@/components/dashboard/fin/CobrancaReguaConfig";

export default function ReguaCobrancaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Régua de cobrança</h1>
        <p className="mt-1 text-sm text-white/50">
          Configure lembretes e cobranças automáticas por dias em relação ao vencimento (D-3, D0, D+3…).
          Active a régua e as etapas desejadas; cada combinação título+etapa+canal só dispara uma vez.
        </p>
      </div>
      <CobrancaReguaConfig />
    </div>
  );
}
