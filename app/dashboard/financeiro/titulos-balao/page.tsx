"use client";

import { TituloBalaoEmitirWorkspace } from "@/components/dashboard/fin/TituloBalaoEmitirWorkspace";

export default function TituloBalaoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
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

      <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TituloBalaoEmitirWorkspace />
      </div>
    </div>
  );
}
