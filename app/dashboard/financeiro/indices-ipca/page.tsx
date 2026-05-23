"use client";

import { IpcaIndiceList } from "@/components/dashboard/fin/IpcaIndiceList";

export default function IpcaIndicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">IPCA — índice de reajuste</h1>
        <p className="text-sm text-white/50 mt-1">
          Série mensal do IBGE para correção de parcelas. A variação acumulada em 12 meses é a referência
          contratual.
        </p>
      </div>
      <IpcaIndiceList />
    </div>
  );
}
