"use client";

import { ConveniosBancoList } from "@/components/dashboard/fin/ConveniosBancoList";

export default function ConveniosBancoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Convênios bancários</h1>
        <p className="text-sm text-white/50 mt-1">
          Ative ou desative convênios. Somente os ativos ficam disponíveis para escolha no sistema.
        </p>
      </div>
      <ConveniosBancoList />
    </div>
  );
}
