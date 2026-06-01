"use client";

import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { textoSaldoDevedorComMemoria } from "@/lib/atendimento-saldo-memoria";
import type { AtendimentoResumoFinanceiro, AtendimentoTituloResumo } from "@/lib/atendimento-service";
import { fetchBoletoEncargosConfig, type BoletoEncargosConfig } from "@/lib/fin-memorial-calculo";
import {
  agregarInadimplenciaPresente,
  titulosVencidosDoPainel,
} from "@/lib/renegociacao-inadimplencia-presente";
import { InadimplenciaPresenteCard } from "@/components/dashboard/renegociacao-form/InadimplenciaPresenteCard";
import type { ContratoHonorariosApiResponse } from "@/lib/validations/contrato-honorarios";
import { cn } from "@/lib/utils";

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: true });

const STATUS_CONTRATO_LABEL: Record<string, string> = {
  "1": "Rascunho",
  "2": "Pendente",
  "3": "Aguardando assinatura",
  "4": "Cancelado",
  "5": "Suspenso",
  "8": "Assinado",
  ASSINADO: "Assinado",
};

const STATUS_FINANCEIRO_LABEL: Record<string, string> = {
  EM_DIA: "Em dia",
  INADIMPLENTE: "Inadimplente",
  QUITADO: "Quitado",
};

function formatBrl(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function formatStatusContrato(status: string | null) {
  if (!status) return "—";
  return STATUS_CONTRATO_LABEL[status] ?? status.replace(/_/g, " ");
}

function ResumoField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <p className="mt-1.5 break-words text-sm font-medium leading-snug text-white/90">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  compactValue,
}: {
  label: string;
  value: string;
  highlight?: "emerald" | "amber" | "rose";
  compactValue?: boolean;
}) {
  const valueClass =
    highlight === "emerald"
      ? "text-emerald-300"
      : highlight === "amber"
        ? "text-amber-300"
        : highlight === "rose"
          ? "text-rose-300"
          : "text-white";

  return (
    <div className="flex min-h-[5rem] min-w-0 flex-col justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-[10px] font-bold uppercase leading-tight tracking-wider text-white/40">{label}</span>
      <p
        className={cn(
          "mt-2 break-words font-mono font-semibold leading-tight",
          compactValue ? "text-xs sm:text-sm" : "text-sm md:text-base",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SectionBlock({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6", className)}>
      <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400/90">{title}</h3>
      {children}
    </div>
  );
}

type Props = {
  contrato: ContratoHonorariosApiResponse;
  financeiro?: AtendimentoResumoFinanceiro | null;
  financeiroCarregando?: boolean;
};

export function RenegociacaoContratoResumo({ contrato, financeiro, financeiroCarregando }: Props) {
  const c = contrato.condicoes;
  const localAssinatura = [contrato.cidadeAssinatura, contrato.ufAssinatura].filter(Boolean).join("/");
  const titulosPagos = financeiro?.titulosPagos ?? [];
  const [encargos, setEncargos] = useState<BoletoEncargosConfig | null>(null);

  useEffect(() => {
    fetchBoletoEncargosConfig()
      .then(setEncargos)
      .catch(() =>
        setEncargos({ multaPercentual: 2, jurosMensalPercentual: 1 }),
      );
  }, []);

  const inadimplenciaPresente = useMemo(() => {
    if (!financeiro || !encargos) return null;
    const vencidos = titulosVencidosDoPainel(
      financeiro.titulosAbertos,
      financeiro.titulosVencidos,
    );
    return agregarInadimplenciaPresente(vencidos, encargos);
  }, [financeiro, encargos]);

  const saldoDevedorTexto = financeiro
    ? textoSaldoDevedorComMemoria(financeiro, c.valorParcela ?? undefined)
    : "—";

  const financeMetrics: {
    label: string;
    value: string;
    highlight?: "emerald" | "amber" | "rose";
    compactValue?: boolean;
  }[] = financeiro
    ? [
        { label: "Valor total do contrato", value: formatBrl(financeiro.valorTotalContrato) },
        { label: "Total pago", value: formatBrl(financeiro.totalPago), highlight: "emerald" },
        {
          label: "Saldo devedor",
          value: saldoDevedorTexto,
          highlight: "amber",
          compactValue: true,
        },
        {
          label: "Quitação",
          value: `${financeiro.percentualQuitacao}% (${financeiro.parcelasPagas}/${financeiro.parcelasTotal} parc.)`,
        },
        {
          label: "Parcelas pagas",
          value: `${financeiro.parcelasPagas} / ${financeiro.parcelasTotal}`,
        },
        { label: "Parcelas em atraso", value: String(financeiro.parcelasEmAtraso) },
        {
          label: "Situação financeira",
          value: STATUS_FINANCEIRO_LABEL[financeiro.statusFinanceiro] ?? financeiro.statusFinanceiro,
        },
      ]
    : [];

  const condicoesMetrics: { label: string; value: string }[] = [
    { label: "Valor negociação", value: formatBrl(c.valorNegociacao) },
    { label: "Valor lote", value: formatBrl(c.valorLote) },
    { label: "Valor parcela mensal", value: formatBrl(c.valorParcela) },
    {
      label: "Qtd. parcelas mensais",
      value: c.numParcelasMensais != null ? String(c.numParcelasMensais) : "—",
    },
    { label: "1ª parcela", value: formatDate(c.dataPrimeiraParcela) },
    { label: "Dia vencimento", value: c.diaVencimento != null ? String(c.diaVencimento) : "—" },
    { label: "Correção anual", value: c.tipoCorrecaoAnual ?? "—" },
    { label: "% correção", value: c.percentualCorrecao != null ? `${c.percentualCorrecao}%` : "—" },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionBlock title="Contrato">
          <div className="grid w-full grid-cols-2 gap-x-6 gap-y-5">
            <ResumoField label="Nº contrato" value={contrato.numeroContrato?.trim() || `#${contrato.id}`} />
            <ResumoField
              label="Status"
              value={formatStatusContrato(financeiro?.statusContrato ?? contrato.status)}
            />
            <ResumoField label="Assinatura" value={formatDate(contrato.dataAssinatura)} />
            <ResumoField label="Local" value={localAssinatura || "—"} />
          </div>
        </SectionBlock>

        <SectionBlock title="Partes e imóvel">
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
            <ResumoField label="Contratante" value={contrato.contratante?.label ?? "—"} className="sm:col-span-2" />
            <ResumoField label="Imobiliária" value={contrato.imobiliaria?.label ?? "—"} />
            <ResumoField label="Corretor" value={contrato.corretor?.label ?? "—"} />
            <ResumoField label="Imóvel" value={contrato.imovel?.label ?? "—"} className="sm:col-span-2" />
          </div>
        </SectionBlock>
      </div>

      <SectionBlock title="Resumo financeiro — montante pago">
        {financeiroCarregando && !financeiro ? (
          <p className="text-sm text-white/40">Carregando posição financeira…</p>
        ) : financeiro ? (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {financeMetrics.map((m) => (
              <Metric
                key={m.label}
                label={m.label}
                value={m.value}
                highlight={m.highlight}
                compactValue={m.compactValue}
              />
            ))}
            <div className="col-span-2 sm:col-span-4">
              <InadimplenciaPresenteCard
                agregado={inadimplenciaPresente}
                nominalPainel={financeiro.valorInadimplente}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/40">
            Posição financeira indisponível. Verifique permissão de atendimento ou títulos do contrato.
          </p>
        )}
      </SectionBlock>

      <SectionBlock title={`Parcelas pagas${titulosPagos.length > 0 ? ` (${titulosPagos.length})` : ""}`}>
        {financeiroCarregando && !financeiro ? (
          <p className="text-sm text-white/40">Carregando parcelas…</p>
        ) : (
          <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
            <DataTable
              value={titulosPagos}
              dataKey="id"
              rows={8}
              rowsPerPageOptions={[8, 15, 30]}
              paginator={titulosPagos.length > 8}
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
              currentPageReportTemplate="{first}–{last} de {totalRecords}"
              className={cn(DASHBOARD_DATATABLE_CLASS, "w-full")}
              pt={TABLE_PT}
              emptyMessage="Nenhuma parcela paga registrada neste contrato."
            >
              <Column
                header="Parc."
                body={(row: AtendimentoTituloResumo) =>
                  dashboardCellMono(String(row.numeroParcela), { size: "parcela" })
                }
                style={{ width: "5rem" }}
              />
              <Column
                header="Vencimento"
                body={(row: AtendimentoTituloResumo) => dashboardCellText(formatDate(row.vencimento))}
              />
              <Column
                header="Valor"
                body={(row: AtendimentoTituloResumo) => dashboardCellMono(formatBrl(row.valorNominal))}
              />
              <Column
                header="Status"
                body={(row: AtendimentoTituloResumo) =>
                  dashboardStatusBadge(row.status, {
                    PAGO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
                  })
                }
                style={{ width: "8rem" }}
              />
            </DataTable>
          </DashboardDataTableShell>
        )}
      </SectionBlock>

      <SectionBlock title="Condições financeiras atuais (contrato)">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {condicoesMetrics.map((m) => (
            <Metric key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
        {c.observacoes?.trim() && (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-white/50">
            {c.observacoes.trim()}
          </p>
        )}
      </SectionBlock>
    </div>
  );
}
