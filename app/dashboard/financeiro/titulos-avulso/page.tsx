"use client";

import { TituloAvulsoEmitirWorkspace } from "@/components/dashboard/fin/TituloAvulsoEmitirWorkspace";

export default function TituloAvulsoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
          Gestão Financeira
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Emitir título avulso
        </h1>
        <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
          Gera um boleto pontual para um contrato: escolha o convênio ativo (beneficiário), o lote
          vendido, parcela, valor e vencimento. O sistema cria o título e registra no banco em uma
          única operação.
        </p>
      </div>

      <div className="px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TituloAvulsoEmitirWorkspace />
      </div>
    </div>
  );
}
