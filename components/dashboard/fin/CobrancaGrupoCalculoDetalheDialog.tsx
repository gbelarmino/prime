"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { FinIndiceSimulacaoParcelaTable } from "@/components/dashboard/fin/FinIndiceSimulacaoParcelaTable";
import { resumirAvisoIndiceLinha } from "@/lib/fin-calculo-indice-aviso";
import {
  buildVencimentoReferenciaLiderGrupo,
  carregarSimulacaoEvolucaoContrato,
  type SimulacaoEvolucaoContrato,
} from "@/lib/fin-indice-simulacao";
import {
  formatContratoRef,
  type CobrancaGrupo,
  type CobrancaGrupoEmitirSimulacao,
} from "@/lib/fin-service";
import { cn } from "@/lib/utils";

type MembroDetalhe = {
  contratoId: number;
  numeroContrato?: string | null;
  quadra?: string | null;
  lote?: number | null;
  valorBackend: number | null;
  aviso: string | null;
  loading: boolean;
  erro: string | null;
  evolucao: SimulacaoEvolucaoContrato | null;
};

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

function loteLabel(quadra?: string | null, lote?: number | null): string {
  if (!quadra && lote == null) return "—";
  return `Q${quadra ?? "?"} L${lote ?? "?"}`;
}

export type CobrancaGrupoCalculoDetalheDialogProps = {
  visible: boolean;
  onHide: () => void;
  grupo: CobrancaGrupo | null;
  simulacao: CobrancaGrupoEmitirSimulacao | null;
  parcelaAlvo: number | null;
  vencimentoEmissao: Date | null;
};

export function CobrancaGrupoCalculoDetalheDialog({
  visible,
  onHide,
  grupo,
  simulacao,
  parcelaAlvo,
  vencimentoEmissao,
}: CobrancaGrupoCalculoDetalheDialogProps) {
  const [membroAtivoId, setMembroAtivoId] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState<MembroDetalhe[]>([]);

  useEffect(() => {
    if (!visible || !grupo || !simulacao || parcelaAlvo == null || parcelaAlvo < 1) {
      setDetalhes([]);
      setMembroAtivoId(null);
      return;
    }

    const itensSim = new Map(simulacao.itens.map((i) => [i.contratoId, i]));
    const inicial: MembroDetalhe[] = grupo.membros.map((m) => {
      const item = itensSim.get(m.contratoId);
      return {
        contratoId: m.contratoId,
        numeroContrato: m.numeroContrato,
        quadra: m.quadra,
        lote: m.lote,
        valorBackend: item?.valorNominal ?? null,
        aviso: item?.aviso ?? null,
        loading: true,
        erro: null,
        evolucao: null,
      };
    });
    setDetalhes(inicial);
    setMembroAtivoId(grupo.contratoLiderId);

    let cancelled = false;

    void (async () => {
      const lider = grupo.membros.find((m) => m.contratoId === grupo.contratoLiderId);
      let vencimentoReferenciaLider: ((parcela: number) => Date) | undefined;
      if (lider?.quadra && lider.lote != null) {
        try {
          vencimentoReferenciaLider = await buildVencimentoReferenciaLiderGrupo({
            empreendimento: grupo.empreendimento,
            quadra: lider.quadra,
            lote: lider.lote,
            parcelaAlvo,
            vencimentoParcelaAlvo: vencimentoEmissao,
          });
        } catch {
          vencimentoReferenciaLider = undefined;
        }
      }

      const resultados = await Promise.all(
        grupo.membros.map(async (m) => {
          if (!m.quadra || m.lote == null) {
            return {
              contratoId: m.contratoId,
              erro: "Lote sem quadra/lote para carregar condições.",
              evolucao: null as SimulacaoEvolucaoContrato | null,
            };
          }
          try {
            const evolucao = await carregarSimulacaoEvolucaoContrato({
              empreendimento: grupo.empreendimento,
              quadra: m.quadra,
              lote: m.lote,
              parcelaAlvo,
              vencimentoParcelaAlvo: vencimentoEmissao,
              vencimentoPorParcelaReferencia: vencimentoReferenciaLider,
            });
            return { contratoId: m.contratoId, erro: null, evolucao };
          } catch (e) {
            return {
              contratoId: m.contratoId,
              erro: e instanceof Error ? e.message : "Falha ao montar evolução.",
              evolucao: null,
            };
          }
        }),
      );

      if (cancelled) return;

      setDetalhes((prev) =>
        prev.map((d) => {
          const r = resultados.find((x) => x.contratoId === d.contratoId);
          if (!r) return { ...d, loading: false };
          return {
            ...d,
            loading: false,
            erro: r.erro,
            evolucao: r.evolucao,
          };
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, grupo, simulacao, parcelaAlvo, vencimentoEmissao]);

  const membroAtivo = useMemo(
    () => detalhes.find((d) => d.contratoId === membroAtivoId) ?? detalhes[0] ?? null,
    [detalhes, membroAtivoId],
  );

  const loading = detalhes.some((d) => d.loading);
  const valorTotalBackend = simulacao?.valorTotal ?? null;

  return (
    <DashboardDialog
      visible={visible}
      onHide={onHide}
      header="Detalhe do cálculo — parcela do grupo"
      className="w-full max-w-4xl"
      pt={{
        root: { className: "rounded-2xl border border-white/10 bg-[#0a2540] shadow-2xl" },
        header: { className: "border-b border-white/10 px-6 py-4" },
        content: { className: "px-6 py-5" },
        footer: { className: "border-t border-white/10 px-6 py-4" },
      }}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
          >
            Fechar
          </button>
        </div>
      }
      modal
      draggable={false}
    >
      {grupo && simulacao && parcelaAlvo != null ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-white/50 leading-relaxed">
            Evolução das parcelas até a <strong className="text-white/75">parcela {parcelaAlvo}</strong>{" "}
            (mesma numeração e cronograma de vencimentos do líder). O valor consolidado usa a soma dos
            rateios por contrato (bases podem diferir).
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Grupo
              </dt>
              <dd className="mt-0.5 font-mono text-white/80">{grupo.numeroContratoBase}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Parcela
              </dt>
              <dd className="mt-0.5 text-white/80">{parcelaAlvo}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Vencimento
              </dt>
              <dd className="mt-0.5 text-white/80">{formatDate(vencimentoEmissao)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Total consolidado
              </dt>
              <dd className="mt-0.5 font-semibold text-emerald-300">
                {loading ? "…" : formatMoney(valorTotalBackend)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {detalhes.map((d) => {
              const ativo = d.contratoId === (membroAtivoId ?? detalhes[0]?.contratoId);
              return (
                <button
                  key={d.contratoId}
                  type="button"
                  onClick={() => setMembroAtivoId(d.contratoId)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs transition",
                    ativo
                      ? "border-blue-400/50 bg-blue-500/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80",
                  )}
                >
                  <span className="font-mono block">
                    {formatContratoRef(d.numeroContrato, d.contratoId)}
                  </span>
                  <span className="text-[10px] text-white/40">
                    {loteLabel(d.quadra, d.lote)} · {formatMoney(d.valorBackend)}
                  </span>
                </button>
              );
            })}
          </div>

          {membroAtivo ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-sm font-medium text-white/85">
                  {formatContratoRef(membroAtivo.numeroContrato, membroAtivo.contratoId)}
                  {membroAtivo.contratoId === grupo.contratoLiderId ? (
                    <span className="ml-2 text-[10px] uppercase text-blue-300">Líder</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {loteLabel(membroAtivo.quadra, membroAtivo.lote)} · valor na API:{" "}
                  <span className="text-emerald-200/90">{formatMoney(membroAtivo.valorBackend)}</span>
                </p>
                {membroAtivo.aviso ? (
                  <p className="mt-2 text-xs text-amber-300/90" title={membroAtivo.aviso}>
                    {resumirAvisoIndiceLinha(membroAtivo.aviso)}
                  </p>
                ) : null}
              </div>

              <div className="max-h-[28rem] overflow-y-auto py-2">
                {membroAtivo.loading ? (
                  <p className="px-4 py-10 text-center text-sm text-white/40">
                    Montando evolução das parcelas…
                  </p>
                ) : membroAtivo.erro ? (
                  <p className="px-4 py-10 text-center text-sm text-rose-300/90">
                    {membroAtivo.erro}
                  </p>
                ) : membroAtivo.evolucao ? (
                  <FinIndiceSimulacaoParcelaTable
                    simulacao={membroAtivo.evolucao.simulacao}
                    labelIndice={membroAtivo.evolucao.labelIndice}
                    condicoesResumo={membroAtivo.evolucao.condicoesResumo}
                    primeiraVencimento={membroAtivo.evolucao.primeiraVencimento}
                    parcelaDestaque={parcelaAlvo}
                    valorBackendParcelaDestaque={membroAtivo.valorBackend}
                    mostrarColunaBackend
                    mostrarColunasEmitido
                  />
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-white/35">
                    Sem evolução disponível.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <p className="text-xs text-white/30 leading-relaxed">
            A coluna API mostra o valor retornado pelo servidor no botão Calcular. Simulado usa as
            mesmas regras da tela Financeiro → Simulação IPCA/IGP-M (6% fixo + índice se positivo,
            teto 12%; índice negativo → só 6%).
            {vencimentoEmissao
              ? ` Vencimento ${formatDate(vencimentoEmissao)} aplicado na parcela ${parcelaAlvo}.`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/45">Calcule os valores do grupo para ver o detalhamento.</p>
      )}
    </DashboardDialog>
  );
}
