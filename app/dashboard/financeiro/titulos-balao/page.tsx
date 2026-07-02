"use client";

import { useState } from "react";
import { TituloBalaoEmitirWorkspace } from "@/components/dashboard/fin/TituloBalaoEmitirWorkspace";
import { TituloBalaoLegadoManualDialog } from "@/components/dashboard/fin/TituloBalaoLegadoManualDialog";

export default function TituloBalaoPage() {
  const [showLegado, setShowLegado] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
              Gestão Financeira
            </div>
            <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
              Emitir título de balão
            </h1>
            <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
              Gera boleto para um balão configurado no contrato (B1, B2…). O vencimento padrão coincide
              com a parcela mensal de referência; balão e parcela mensal na mesma numeração coexistem
              como séries distintas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLegado(true)}
            className="mt-2 inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/20"
          >
            Balão legado
          </button>
        </div>
      </div>

      <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TituloBalaoEmitirWorkspace />
      </div>

      <TituloBalaoLegadoManualDialog
        visible={showLegado}
        onHide={() => setShowLegado(false)}
      />
    </div>
  );
}
