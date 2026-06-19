"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  finService,
  formatContratoRef,
  type CobrancaGrupo,
  type CobrancaGrupoEmitirSimulacaoItem,
} from "@/lib/fin-service";
import { resumirAvisoIndiceLinha } from "@/lib/fin-calculo-indice-aviso";
import type { PreviewLote } from "@/lib/fin-lote-preview";
import {
  diaSemanaCurto,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import { cn } from "@/lib/utils";

type ItemDetalhe = {
  parcela: number;
  vencimento: string;
  vencimentoBruto: string;
  ajustadoPorDiaUtil: boolean;
  excedente: boolean;
  parcelaReajuste: boolean;
  valorTotal: number | null;
  aviso: string | null;
  rateios: CobrancaGrupoEmitirSimulacaoItem[];
};

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return parseIsoDate(iso.slice(0, 10)).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

type CobrancaGrupoLotePreviewDialogProps = {
  visible: boolean;
  onHide: () => void;
  grupo: CobrancaGrupo | null;
  previewLote: PreviewLote | null;
  convenioId: string | null;
  convenioNome?: string | null;
  numeroContratoLider?: string | null;
};

export function CobrancaGrupoLotePreviewDialog({
  visible,
  onHide,
  grupo,
  previewLote,
  convenioId,
  convenioNome,
  numeroContratoLider,
}: CobrancaGrupoLotePreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itensDetalhe, setItensDetalhe] = useState<ItemDetalhe[]>([]);

  useEffect(() => {
    if (!visible || !grupo || !previewLote || !convenioId) {
      setItensDetalhe([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const membros = grupo.membros.map((m) => ({ contratoId: m.contratoId }));
      const detalhes: ItemDetalhe[] = [];

      for (const item of previewLote.itens) {
        try {
          const res = await finService.simularEmissaoCobrancaGrupo(grupo.id, {
            convenioId,
            vencimento: item.vencimento,
            numeroParcela: item.parcela,
            membros,
          });
          detalhes.push({
            ...item,
            valorTotal: res.valorTotal,
            aviso: res.itens.find((i) => i.aviso)?.aviso ?? null,
            rateios: res.itens,
          });
        } catch (e) {
          detalhes.push({
            ...item,
            valorTotal: null,
            aviso: e instanceof Error ? e.message : "Falha na simulação.",
            rateios: [],
          });
        }
      }

      for (const item of previewLote.itensExcedentes) {
        detalhes.push({
          ...item,
          valorTotal: null,
          aviso: null,
          rateios: [],
        });
      }

      if (!cancelled) setItensDetalhe(detalhes);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, grupo, previewLote, convenioId]);

  const valorTotalLote = useMemo(() => {
    let total = 0;
    let incompleto = false;
    for (const item of itensDetalhe) {
      if (item.excedente) continue;
      if (item.valorTotal == null) {
        incompleto = true;
        continue;
      }
      total += item.valorTotal;
    }
    return incompleto ? null : total;
  }, [itensDetalhe]);

  const prontoParaCriar = useMemo(
    () =>
      !loading &&
      itensDetalhe.some((i) => !i.excedente) &&
      itensDetalhe
        .filter((i) => !i.excedente)
        .every((i) => i.valorTotal != null && i.valorTotal >= 0.01 && !i.aviso),
    [itensDetalhe, loading],
  );

  return (
    <DashboardDialog
      visible={visible}
      onHide={onHide}
      header="Pré-visualização — rascunhos em lote"
      className="w-full max-w-2xl"
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
      {previewLote && grupo ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-white/50 leading-relaxed">
            Cada linha será um rascunho consolidado no contrato líder, com rateio automático entre
            os {grupo.membros.length} lotes do grupo.
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Grupo
              </dt>
              <dd className="mt-0.5 font-mono text-white/80">{grupo.numeroContratoBase}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Líder
              </dt>
              <dd className="mt-0.5 text-white/80">
                {formatContratoRef(numeroContratoLider, grupo.contratoLiderId)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Convênio
              </dt>
              <dd className="mt-0.5 text-white/80">{convenioNome ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Parcelas
              </dt>
              <dd className="mt-0.5 text-white/80">
                {previewLote.parcelaInicial}–{previewLote.parcelaFinal} ({previewLote.quantidade}{" "}
                título{previewLote.quantidade === 1 ? "" : "s"})
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Total nominal estimado
              </dt>
              <dd className="mt-0.5 font-semibold text-emerald-300">
                {loading ? "Calculando…" : formatMoney(valorTotalLote)}
              </dd>
            </div>
          </dl>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0a2540] text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <tr>
                    <th className="px-4 py-3">Parcela</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-white/70">
                  {previewLote.itensRevisao.map((item) => {
                    const detalhe = itensDetalhe.find((d) => d.parcela === item.parcela);
                    return (
                      <tr
                        key={item.parcela}
                        className={cn(
                          "bg-white/[0.02]",
                          item.excedente &&
                            "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/25 opacity-80",
                          !item.excedente &&
                            item.ajustadoPorDiaUtil &&
                            "bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/25",
                        )}
                      >
                        <td className="px-4 py-2.5 align-top font-mono">
                          <span className={cn(item.excedente && "text-violet-200/90")}>
                            {item.parcela}
                          </span>
                          {item.excedente ? (
                            <span className="mt-1 block text-[10px] font-medium text-violet-300/90">
                              {item.parcelaReajuste
                                ? "Reajuste — não será gerada"
                                : "Fora deste lote"}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                item.excedente &&
                                  "text-violet-200/70 line-through decoration-violet-400/40",
                                !item.excedente &&
                                  item.ajustadoPorDiaUtil &&
                                  "font-medium text-amber-100",
                              )}
                            >
                              {formatDate(item.vencimento)}
                            </span>
                            {!item.excedente && item.ajustadoPorDiaUtil ? (
                              <span className="text-[10px] font-medium text-amber-300/90">
                                Seria {formatDate(item.vencimentoBruto)} (
                                {diaSemanaCurto(parseIsoDate(item.vencimentoBruto))}) — fim de
                                semana
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 align-top text-right">
                          {!item.excedente ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-medium text-white/85">
                                {loading && !detalhe ? "…" : formatMoney(detalhe?.valorTotal)}
                              </span>
                              {detalhe && detalhe.rateios.length > 0 ? (
                                <span className="text-[10px] text-white/40 leading-snug max-w-[12rem]">
                                  {detalhe.rateios
                                    .map(
                                      (r) =>
                                        `${r.numeroContrato ?? r.contratoId}: ${formatMoney(r.valorNominal)}`,
                                    )
                                    .join(" · ")}
                                </span>
                              ) : null}
                              {detalhe?.aviso ? (
                                <span
                                  className="text-[10px] text-amber-300/85 leading-snug max-w-[14rem] text-right"
                                  title={detalhe.aviso}
                                >
                                  {resumirAvisoIndiceLinha(detalhe.aviso)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {previewLote.ajustadosPorDiaUtil > 0 ? (
            <p className="text-xs text-amber-200/75 leading-relaxed">
              {previewLote.ajustadosPorDiaUtil} vencimento(s) em destaque caíam em fim de semana e
              foram deslocados para o próximo dia útil.
            </p>
          ) : null}

          {previewLote.itensExcedentes.length > 0 ? (
            <p className="text-xs text-violet-200/75 leading-relaxed">
              {previewLote.itensExcedentes.length} parcela(s) em violeta não entram neste lote
              {previewLote.itensExcedentes.some((i) => i.parcelaReajuste)
                ? ` (a ${previewLote.parcelaReajusteLimite}ª exige reajuste antes da emissão em lote)`
                : ""}
              .
            </p>
          ) : null}

          <p className="text-xs text-white/35 leading-relaxed">
            Emissão em lote até a parcela {previewLote.ultimaParcelaEmitivel}. Status final:{" "}
            <span className="text-white/55">RASCUNHO</span>.
            {!prontoParaCriar && !loading ? (
              <>
                {" "}
                Algumas parcelas não puderam ser calculadas — corrija os avisos ou informe valores
                manualmente antes de criar os rascunhos.
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/45">Selecione quantidade e convênio para pré-visualizar.</p>
      )}
    </DashboardDialog>
  );
}
