"use client";

import { Suspense } from "react";
import { ChamadoDetalhePanel } from "@/components/dashboard/ChamadoDetalhePanel";

export default function ChamadoDetalhePage() {
  return (
    <Suspense fallback={<p className="px-4 text-sm text-white/40">Carregando…</p>}>
      <ChamadoDetalhePanel />
    </Suspense>
  );
}
