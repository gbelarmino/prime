import type { Metadata } from "next";
import { AtendimentoBusca } from "@/components/dashboard/atendimento/AtendimentoBusca";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Consulta · Atendimento"),
  description: "Busca multicritério de contratos para atendimento ao cliente.",
};

export default function AtendimentoConsultaPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
          Central de Atendimento
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Consulta de contratos
        </h1>
        <p className="mt-1 max-w-2xl text-white/40">
          Localize contratos por número, cliente, CPF, celular, quadra ou lote e abra o painel
          financeiro para cobrança e registro de ocorrências.
        </p>
      </div>
      <AtendimentoBusca />
    </div>
  );
}
