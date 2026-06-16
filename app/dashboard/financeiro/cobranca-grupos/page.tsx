"use client";

import { CobrancaGruposWorkspace } from "@/components/dashboard/fin/CobrancaGruposWorkspace";

export default function CobrancaGruposPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
          Gestão Financeira
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Grupos de cobrança legado
        </h1>
        <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
          Agrupa contratos desmembrados (mesmo CTR base, lotes distintos) para emitir um único
          boleto no contrato líder, com rateio por lote e baixa automática nos demais membros.
        </p>
      </div>

      <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <CobrancaGruposWorkspace />
      </div>
    </div>
  );
}
