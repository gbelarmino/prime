"use client";

import { IgpmIndiceList } from "@/components/dashboard/fin/IgpmIndiceList";

export default function IgpmIndicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">IGP-M — índice de reajuste</h1>
        <p className="mt-1 text-sm text-white/50">
          Série mensal do BCB para correção de parcelas em contratos com IGP-M. A variação acumulada em 12
          meses é a referência contratual.
        </p>
      </div>
      <IgpmIndiceList />
    </div>
  );
}
