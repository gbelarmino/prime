"use client";

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
import type { RenegociacaoSimulacaoResponse, TituloAfetado } from "@/lib/renegociacao-types";
import { PAPEL_VENCIDA, PAPEL_VINCENDA_REEMITIDA } from "@/lib/renegociacao-t1-calculo";
import type { T1PreviewResultado } from "@/lib/renegociacao-t1-calculo";
import { cn } from "@/lib/utils";

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PassoHeader({ n, titulo }: { n: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">
        {n}
      </span>
      <h4 className="text-sm font-semibold text-white/90">{titulo}</h4>
    </div>
  );
}

type Props = {
  simulacao?: RenegociacaoSimulacaoResponse | null;
  preview?: T1PreviewResultado | null;
  className?: string;
};

export function T1AcordoDetalheCard({ simulacao, preview, className }: Props) {
  const vencidas: TituloAfetado[] =
    simulacao?.titulosAfetados.filter((t) => t.papel === PAPEL_VENCIDA) ??
    preview?.vencidas.map((t) => ({
      id: t.id,
      numeroParcela: t.numeroParcela,
      vencimento: t.vencimento,
      valorNominal: t.valorNominal,
      status: t.status,
      papel: PAPEL_VENCIDA,
    })) ??
    [];

  const vincendasReemitidas: TituloAfetado[] =
    simulacao?.titulosAfetados.filter((t) => t.papel === PAPEL_VINCENDA_REEMITIDA) ??
    preview?.vincendasReemitir.map((t) => ({
      id: t.id,
      numeroParcela: t.numeroParcela,
      vencimento: t.vencimento,
      valorNominal: t.valorNominal,
      status: t.status,
      papel: PAPEL_VINCENDA_REEMITIDA,
    })) ??
    [];

  const cronograma =
    simulacao?.cronogramaFuturo.map((p) => ({
      numeroParcela: p.numeroParcela,
      vencimento: p.vencimento,
      valorVigente: p.valorVigente ?? 0,
      valorAcordo: p.valorAcordo ?? 0,
      valorComposto: p.valorNominal,
    })) ??
    preview?.cronograma ??
    [];

  const vpTotal = simulacao?.totalAnterior ?? preview?.vpTotal ?? 0;
  const totalAcordo = simulacao?.totalNovo ?? preview?.totalAcordo ?? 0;
  const parcelaAcordo =
    cronograma.length > 0
      ? cronograma[0]!.valorAcordo
      : (preview?.parcelaAcordoMedia ?? 0);
  const n = cronograma.length || preview?.quantidadeParcelas || 0;
  const primeira = preview?.primeiraVincenda ?? cronograma[0]?.numeroParcela;
  const ultima =
    preview?.ultimaVincendaAcoplada ??
    cronograma[cronograma.length - 1]?.numeroParcela;

  const avisos = simulacao?.avisos ?? preview?.avisos ?? [];
  const desconto = simulacao?.memoriaCalculo?.vlDesconto ?? Math.max(0, vpTotal - totalAcordo);

  if (vencidas.length === 0 && !preview?.erro) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-4 sm:px-5">
        <p className="text-sm text-violet-100/90">
          Modelo T1: a mora (valor presente das vencidas) é diluída em{" "}
          <strong className="font-semibold text-white">{n || "N"}</strong> parcelas e{" "}
          <strong className="font-semibold text-white">somada</strong> ao valor normal das próximas{" "}
          {n || "N"} vincendas. Vencidas são canceladas; vincendas P..P+N−1 são reemitidas com valor
          composto.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <PassoHeader
          n={1}
          titulo={`Parcelas vencidas — ${formatBrl(vpTotal)} a valor presente`}
        />
        <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
          <DataTable
            value={vencidas}
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            emptyMessage="Nenhuma vencida na simulação."
          >
            <Column
              field="numeroParcela"
              header="Parc."
              body={(r) => dashboardCellMono(String(r.numeroParcela))}
            />
            <Column
              field="vencimento"
              header="Vencimento"
              body={(r) =>
                dashboardCellText(new Date(r.vencimento).toLocaleDateString("pt-BR"))
              }
            />
            <Column
              field="valorNominal"
              header="Nominal"
              body={(r) => dashboardCellMono(formatBrl(r.valorNominal))}
            />
            <Column
              header="Na efetivação"
              body={() =>
                dashboardStatusBadge("Cancelar", {
                  Cancelar: "border-rose-500/30 bg-rose-500/15 text-rose-200",
                })
              }
            />
          </DataTable>
        </DashboardDataTableShell>
      </section>

      <section className="flex flex-col gap-3">
        <PassoHeader
          n={2}
          titulo={`Acordo da mora — ${formatBrl(totalAcordo)} em ${n} parcela(s)`}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricMini label="VP total (mora)" value={formatBrl(vpTotal)} />
          <MetricMini
            label="Desconto sobre VP"
            value={desconto > 0.005 ? formatBrl(desconto) : "Nenhum"}
          />
          <MetricMini label="Total do acordo" value={formatBrl(totalAcordo)} />
          <MetricMini label="Mora por parcela (média)" value={formatBrl(parcelaAcordo)} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PassoHeader
          n={3}
          titulo={`Vincendas ${primeira}–${ultima} — valor composto (vigente + mora)`}
        />
        <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
          <DataTable
            value={cronograma}
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            emptyMessage="Sem vincendas para compor."
          >
            <Column
              field="numeroParcela"
              header="Parc."
              body={(r) => dashboardCellMono(String(r.numeroParcela))}
            />
            <Column
              field="vencimento"
              header="Vencimento"
              body={(r) =>
                dashboardCellText(new Date(r.vencimento).toLocaleDateString("pt-BR"))
              }
            />
            <Column
              header="Vigente"
              body={(r) => dashboardCellMono(formatBrl(r.valorVigente))}
            />
            <Column
              header="+ Mora"
              body={(r) => dashboardCellMono(formatBrl(r.valorAcordo))}
            />
            <Column
              header="= Boleto"
              body={(r) => dashboardCellMono(formatBrl(r.valorComposto))}
            />
          </DataTable>
        </DashboardDataTableShell>
        {vincendasReemitidas.length > 0 && (
          <p className="text-xs text-white/45">
            {vincendasReemitidas.length} título(s) vincenda(s) serão cancelados e reemitidos com o
            valor composto acima.
          </p>
        )}
      </section>

      {ultima != null && (
        <section className="flex flex-col gap-2">
          <PassoHeader n={4} titulo="Demais vincendas — sem alteração" />
          <p className="pl-10 text-sm text-white/60">
            Parcelas após a <span className="font-mono text-white/80">{ultima}</span> permanecem com
            o valor contratual original.
          </p>
        </section>
      )}

      {avisos.length > 0 && (
        <ul className="list-decimal space-y-1.5 pl-5 text-sm text-amber-200/90">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      {preview?.erro && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
          {preview.erro}
        </p>
      )}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
