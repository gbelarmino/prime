"use client";

import { TitulosIgpmSimulacaoWorkspace } from "@/components/dashboard/fin/TitulosIgpmSimulacaoWorkspace";

export default function SimulacaoIgpmPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Simulação IGP-M por lote</h1>
        <p className="mt-1 text-sm text-white/50">
          Pesquise por empreendimento, quadra e lote para comparar títulos emitidos com a projeção de
          reajuste IGP-M a partir da 1ª parcela — mesmos critérios da simulação IPCA.
        </p>
      </div>
      <TitulosIgpmSimulacaoWorkspace />
    </div>
  );
}
