"use client";

import { IgpmIndiceList } from "@/components/dashboard/fin/IgpmIndiceList";

export default function IgpmIndicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">IGP-M — índice de reajuste</h1>
        <p className="mt-1 text-sm text-white/50">
          Variação mensal do BCB (série 189) e acumulado em 12 meses oficial da FGV (número-índice via
          Ipeadata). A coluna 12 meses é a referência contratual para reajuste.
        </p>
      </div>
      <IgpmIndiceList />
    </div>
  );
}
