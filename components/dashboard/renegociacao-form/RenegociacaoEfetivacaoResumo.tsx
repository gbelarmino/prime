"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, ListChecks } from "lucide-react";
import { Button } from "primereact/button";
import {
  montarResumoEfetivacao,
  type EfetivacaoResumoSecao,
} from "@/lib/renegociacao-efetivacao-resumo";
import type { AtendimentoResumoFinanceiro } from "@/lib/atendimento-service";
import type { InadimplenciaPresenteAgregado } from "@/lib/renegociacao-inadimplencia-presente";
import type {
  ModalidadeRenegociacao,
  RenegociacaoSimulacaoResponse,
} from "@/lib/renegociacao-types";
import { cn } from "@/lib/utils";

type Props = {
  modalidade: ModalidadeRenegociacao | null;
  simulacao: RenegociacaoSimulacaoResponse | null;
  parcelaInicial: number;
  financeiro: AtendimentoResumoFinanceiro | null;
  inadimplenciaQuitacao: InadimplenciaPresenteAgregado | null;
  processoId: number | null;
  documentosOk: boolean;
  propostaId: number | null;
  contratoId: number;
  className?: string;
};

function SecaoResumo({ secao, destaque }: { secao: EfetivacaoResumoSecao; destaque?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5",
        destaque
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <h3
        className={cn(
          "text-xs font-bold uppercase tracking-widest",
          destaque ? "text-emerald-300/90" : "text-white/45",
        )}
      >
        {secao.titulo}
      </h3>
      <ul className="mt-3 space-y-2">
        {secao.itens.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-snug text-white/75">
            <Circle
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 fill-current",
                destaque ? "text-emerald-400" : "text-violet-400/80",
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RenegociacaoEfetivacaoResumo({
  modalidade,
  simulacao,
  parcelaInicial,
  financeiro,
  inadimplenciaQuitacao,
  processoId,
  documentosOk,
  propostaId,
  contratoId,
  className,
}: Props) {
  const resumo = montarResumoEfetivacao({
    modalidade,
    simulacao,
    parcelaInicial,
    financeiro,
    inadimplenciaQuitacao,
    processoId,
    documentosOk,
    propostaId,
  });

  const secaoEfetivar = resumo.secoes.find((s) => s.titulo.startsWith("Ao clicar"));
  const demaisSecoes = resumo.secoes.filter((s) => s !== secaoEfetivar);

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
        <ListChecks className="mt-0.5 h-6 w-6 shrink-0 text-violet-400" />
        <div>
          <p className="text-sm font-medium text-white">Resumo do que será feito</p>
          <p className="mt-1 text-xs text-white/50">
            Confira abaixo o impacto no contrato, nos títulos e na cobrança antes de concluir.
          </p>
        </div>
      </div>

      {resumo.avisoPrincipal ? (
        <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-4 sm:px-5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-100/90">{resumo.avisoPrincipal}</p>
        </div>
      ) : null}

      {resumo.podeEfetivarNoWizard ? (
        <div className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 sm:px-5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-100/85">
            O botão <strong className="font-semibold">Efetivar</strong> executa as ações listadas na
            seção destacada abaixo.
          </p>
        </div>
      ) : null}

      <div className="grid w-full gap-3">
        {demaisSecoes.map((secao) => (
          <SecaoResumo key={secao.titulo} secao={secao} />
        ))}
        {secaoEfetivar ? <SecaoResumo secao={secaoEfetivar} destaque /> : null}
      </div>

      {!resumo.podeEfetivarNoWizard && modalidade === "T4_QUITACAO" ? (
        <Link href={`/dashboard/atendimento/painel?id=${contratoId}`}>
          <Button
            type="button"
            className="w-full rounded-full border-0 bg-violet-600 px-6 py-3 text-xs font-black uppercase tracking-widest sm:w-auto"
            icon="pi pi-external-link"
            label="Abrir painel de atendimento"
          />
        </Link>
      ) : null}
    </div>
  );
}
