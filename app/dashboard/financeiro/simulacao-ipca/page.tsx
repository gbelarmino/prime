"use client";

import { TitulosIpcaSimulacaoWorkspace } from "@/components/dashboard/fin/TitulosIpcaSimulacaoWorkspace";

export default function SimulacaoIpcaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Simulação IPCA por lote</h1>
        <p className="text-sm text-white/50 mt-1">
          Pesquise por empreendimento, quadra e lote para comparar títulos emitidos com a projeção de
          reajuste IPCA a partir da 1ª parcela.
        </p>
      </div>
      <TitulosIpcaSimulacaoWorkspace />
    </div>
  );
}
