"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  FileUp,
  GitCompareArrows,
  Lock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import {
  finService,
  type ConciliacaoItem,
  type ConciliacaoItemStatus,
  type ConciliacaoSessao,
  type ConvenioBanco,
} from "@/lib/fin-service";

const ITEM_TONES: Record<ConciliacaoItemStatus, string> = {
  CONCILIADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  DIVERGENCIA_VALOR: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  SO_BANCO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  SO_SISTEMA: "border-orange-500/25 bg-orange-500/15 text-orange-300",
  EM_ANALISE: "border-blue-500/25 bg-blue-500/15 text-blue-300",
};

const ITEM_LABELS: Record<ConciliacaoItemStatus, string> = {
  CONCILIADO: "Conciliado",
  DIVERGENCIA_VALOR: "Divergência",
  SO_BANCO: "Só banco",
  SO_SISTEMA: "Só sistema",
  EM_ANALISE: "Em análise",
};

/** Tons indexados pelo texto exibido no badge (primeiro arg. de `dashboardStatusBadge`). */
const ITEM_LABEL_TONES: Record<string, string> = Object.fromEntries(
  (Object.keys(ITEM_TONES) as ConciliacaoItemStatus[]).map((key) => [
    ITEM_LABELS[key],
    ITEM_TONES[key],
  ]),
);

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toIsoDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "amber" | "rose" | "blue" | "neutral";
}) {
  const borderAccent =
    accent === "emerald"
      ? "border-l-emerald-500/50"
      : accent === "amber"
        ? "border-l-amber-500/50"
        : accent === "rose"
          ? "border-l-rose-500/50"
          : accent === "blue"
            ? "border-l-blue-500/50"
            : "border-l-white/20";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 border-l-[3px] bg-white/[0.03] px-4 py-3",
        borderAccent,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-white/40">{hint}</p> : null}
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  description,
  done,
  active,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "relative flex gap-3 rounded-xl border px-3 py-3 transition-colors",
        active ? "border-blue-500/35 bg-blue-500/[0.07]" : "border-white/8 bg-white/[0.02]",
        done && !active && "border-emerald-500/20 bg-emerald-500/[0.04]",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done
            ? "bg-emerald-500/20 text-emerald-300"
            : active
              ? "bg-blue-500/25 text-blue-200"
              : "bg-white/10 text-white/45",
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] leading-relaxed text-white/45">{description}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

export function ConciliacaoDiariaWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [convenioId, setConvenioId] = useState<string | null>(null);
  const convenioSelecionado = convenios.find((c) => c.id === convenioId) ?? null;
  const extratoFormatoAsaas = convenioSelecionado?.tipoIntegracao === "ASAAS";
  const [dataRef, setDataRef] = useState<Date | null>(yesterday());
  const [sessao, setSessao] = useState<ConciliacaoSessao | null>(null);
  const [loading, setLoading] = useState(false);
  const [saldoFechamentoBanco, setSaldoFechamentoBanco] = useState<number | null>(null);
  const [saldoFechamentoSistema, setSaldoFechamentoSistema] = useState<number | null>(null);

  useEffect(() => {
    finService
      .listConvenios()
      .then((lista) => setConvenios(lista))
      .catch(() => toast.error("Falha ao carregar convênios."));
  }, []);

  const abrirSessao = async () => {
    if (!convenioId || !dataRef) {
      toast.error("Selecione convênio e data.");
      return;
    }
    setLoading(true);
    try {
      const s = await finService.abrirConciliacao({
        convenioId,
        dataReferencia: toIsoDate(dataRef),
      });
      setSessao(s);
      toast.success("Sessão aberta. Siga o fluxo à esquerda.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir sessão.");
    } finally {
      setLoading(false);
    }
  };

  const run = async (fn: () => Promise<ConciliacaoSessao>, ok: string) => {
    if (!sessao) return;
    setLoading(true);
    try {
      const s = await fn();
      setSessao(s);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operação falhou.");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File | null) => {
    if (!file || !sessao) return;
    await run(() => finService.importarConciliacaoExtrato(sessao.id, file), "Extrato importado.");
  };

  const fechar = async () => {
    if (!sessao) return;
    setLoading(true);
    try {
      const s = await finService.fecharConciliacao(sessao.id, {
        saldoFechamentoBanco: saldoFechamentoBanco ?? undefined,
        saldoFechamentoSistema: saldoFechamentoSistema ?? undefined,
      });
      setSessao(s);
      toast.success("Dia fechado. Relatório disponível para auditoria.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível fechar.");
    } finally {
      setLoading(false);
    }
  };

  const aberta = sessao?.status === "ABERTA";
  const temExtrato = (sessao?.totalCreditoBanco ?? 0) > 0 || (sessao?.totalDebitoBanco ?? 0) > 0;
  const temSistema = (sessao?.totalCreditoSistema ?? 0) > 0 || (sessao?.totalDebitoSistema ?? 0) > 0;
  const temMatching = (sessao?.itens.length ?? 0) > 0;

  const statusBody = (row: ConciliacaoItem) =>
    dashboardStatusBadge(ITEM_LABELS[row.status], ITEM_LABEL_TONES);

  const extratoBody = (row: ConciliacaoItem) => (
    <div className="flex flex-col gap-0.5">
      {dashboardCellMono(formatMoney(row.extratoValor))}
      {row.extratoHistorico ? (
        <span className="max-w-[220px] truncate text-[10px] text-white/35">{row.extratoHistorico}</span>
      ) : null}
    </div>
  );

  const sistemaBody = (row: ConciliacaoItem) => (
    <div className="flex flex-col gap-0.5">
      {dashboardCellMono(formatMoney(row.sistemaValor))}
      {row.sistemaHistorico ? (
        <span className="max-w-[220px] truncate text-[10px] text-white/35">{row.sistemaHistorico}</span>
      ) : null}
    </div>
  );

  const actionBtn =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-45";
  const actionSecondary = cn(actionBtn, "border border-white/15 bg-white/[0.03] text-white/85 hover:bg-white/8");
  const actionPrimary = cn(actionBtn, "bg-blue-600 text-white hover:bg-blue-500");

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      {/* Configuração da sessão */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/40">
            {sessao ? "Sessão ativa" : "Nova sessão"}
          </h2>
          {sessao ? (
            <button
              type="button"
              onClick={() => {
                setSessao(null);
                setSaldoFechamentoBanco(null);
                setSaldoFechamentoSistema(null);
              }}
              className="text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              Trocar convênio ou data
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Convênio</label>
            <Dropdown
              value={convenioId}
              options={convenios.map((c) => ({ label: c.nome, value: c.id }))}
              onChange={(e) => setConvenioId(e.value ?? null)}
              placeholder="Conta / convênio"
              className="w-full"
              disabled={!!sessao && !aberta}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Data referência</label>
            <Calendar
              value={dataRef}
              onChange={(e) => setDataRef((e.value as Date) ?? null)}
              dateFormat="dd/mm/yy"
              showIcon
              disabled={!!sessao && !aberta}
              className="w-full"
            />
          </div>
          {!sessao ? (
            <button
              type="button"
              onClick={abrirSessao}
              disabled={loading}
              className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <GitCompareArrows className="h-4 w-4" />
              Abrir sessão
            </button>
          ) : null}
        </div>
      </section>

      {!sessao ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
          <GitCompareArrows className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-medium text-white/60">
            Selecione o convênio e a data, depois abra a sessão para iniciar a conciliação.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-white/35">
            O fluxo guia: carregar pagamentos do sistema → importar extrato → matching → fechar o dia com
            relatório auditável.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          {/* Coluna de fluxo */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-white">{sessao.convenioNome}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    sessao.status === "FECHADA"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-300",
                  )}
                >
                  {sessao.status === "FECHADA" ? "Fechada" : "Aberta"}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-white/55">{sessao.dataReferencia}</p>
            </div>

            {aberta ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Fluxo do dia
                  </h3>
                  <ol className="flex flex-col gap-2">
                    <WorkflowStep
                      step={1}
                      title="Sistema"
                      description="Pagamentos e tarifas registrados no sistema na data."
                      done={temSistema}
                      active={!temSistema}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          run(
                            () => finService.recarregarConciliacaoSistema(sessao.id),
                            "Movimentos do sistema atualizados.",
                          )
                        }
                        className={actionSecondary}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Recarregar
                      </button>
                    </WorkflowStep>

                    <WorkflowStep
                      step={2}
                      title="Extrato bancário"
                      description="Importe o CSV exportado do banco ou Asaas."
                      done={temExtrato}
                      active={temSistema && !temExtrato}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => fileRef.current?.click()}
                        className={actionSecondary}
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Importar CSV
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          void onFile(f ?? null);
                          e.target.value = "";
                        }}
                      />
                      <details className="group text-[10px] text-white/40">
                        <summary className="cursor-pointer list-none text-white/50 hover:text-white/70">
                          Formato do arquivo
                        </summary>
                        {extratoFormatoAsaas ? (
                          <p className="mt-2 leading-relaxed">
                            Exporte o extrato financeiro no painel Asaas (CSV padrão da wallet).
                            Linhas de saldo inicial/final são ignoradas; importamos só movimentos da{" "}
                            <strong className="text-white/60">data da sessão</strong>. O ID da fatura da
                            cobrança vira referência para o matching.
                          </p>
                        ) : (
                          <p className="mt-2 leading-relaxed">
                            CSV simples:{" "}
                            <code className="text-white/55">
                              data, valor, tipo, descricao, id_externo
                            </code>
                            <br />
                            Tipo: C/D ou CREDITO/DEBITO. Apenas linhas da data da sessão.
                          </p>
                        )}
                      </details>
                    </WorkflowStep>

                    <WorkflowStep
                      step={3}
                      title="Matching"
                      description="Cruza extrato com o sistema por valor e referência."
                      done={temMatching && sessao.itensPendentes === 0}
                      active={temExtrato && temSistema}
                    >
                      <button
                        type="button"
                        disabled={loading || !temExtrato || !temSistema}
                        onClick={() =>
                          run(() => finService.matchingConciliacao(sessao.id), "Matching concluído.")
                        }
                        className={actionPrimary}
                      >
                        <GitCompareArrows className="h-3.5 w-3.5" />
                        Executar matching
                      </button>
                    </WorkflowStep>
                  </ol>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/90">
                    <Lock className="h-3.5 w-3.5" />
                    Fechar dia
                  </h3>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                    Informe os saldos de fechamento e encerre a sessão. Pendências bloqueiam o fecho.
                  </p>
                  {sessao.itensPendentes > 0 ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300/90">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {sessao.itensPendentes} item(ns) pendente(s)
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    <InputNumber
                      value={saldoFechamentoBanco}
                      onValueChange={(e) => setSaldoFechamentoBanco(e.value ?? null)}
                      mode="currency"
                      currency="BRL"
                      locale="pt-BR"
                      placeholder="Saldo banco"
                      className="w-full"
                    />
                    <InputNumber
                      value={saldoFechamentoSistema}
                      onValueChange={(e) => setSaldoFechamentoSistema(e.value ?? null)}
                      mode="currency"
                      currency="BRL"
                      locale="pt-BR"
                      placeholder="Saldo sistema"
                      className="w-full"
                    />
                    <button
                      type="button"
                      disabled={loading || sessao.itensPendentes > 0}
                      onClick={fechar}
                      className={cn(
                        actionBtn,
                        "bg-emerald-600 text-white hover:bg-emerald-500",
                        sessao.itensPendentes > 0 && "cursor-not-allowed",
                      )}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Fechar e gerar relatório
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4">
                <p className="text-sm font-semibold text-emerald-200">Sessão encerrada</p>
                {sessao.relatorioHash ? (
                  <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-white/45">
                    {sessao.relatorioHash}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => finService.downloadConciliacaoRelatorio(sessao.id)}
                  className={cn(actionSecondary, "mt-4")}
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar relatório JSON
                </button>
              </div>
            )}
          </aside>

          {/* Coluna principal: métricas + tabela */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label="Crédito banco"
                value={formatMoney(sessao.totalCreditoBanco)}
                hint={`Débito ${formatMoney(sessao.totalDebitoBanco)}`}
                accent="blue"
              />
              <MetricTile
                label="Crédito sistema"
                value={formatMoney(sessao.totalCreditoSistema)}
                hint={`Débito ${formatMoney(sessao.totalDebitoSistema)}`}
                accent="neutral"
              />
              <MetricTile
                label="Conciliados"
                value={String(sessao.itensConciliados)}
                hint={`${sessao.itens.length} linhas no total`}
                accent="emerald"
              />
              <MetricTile
                label="Pendentes"
                value={String(sessao.itensPendentes)}
                hint={sessao.itensPendentes > 0 ? "Resolver antes de fechar" : "Pronto para fechar"}
                accent={sessao.itensPendentes > 0 ? "amber" : "emerald"}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                  Itens da conciliação
                </h3>
                {temMatching ? (
                  <span className="text-[11px] text-white/40">
                    {sessao.itens.filter((i) => i.status === "CONCILIADO").length} de {sessao.itens.length}{" "}
                    conciliados
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-white/35">
                    <Circle className="h-2 w-2 fill-current" />
                    Aguardando matching
                  </span>
                )}
              </div>

              <DashboardDataTableShell>
                <DataTable
                  value={sessao.itens}
                  className={DASHBOARD_DATATABLE_CLASS}
                  pt={dashboardDataTablePt({ density: "compact", paginator: false })}
                  emptyMessage="Nenhum item ainda. Complete os passos 1–3 no painel à esquerda."
                >
                  <Column header="Status" body={statusBody} style={{ width: "9rem" }} />
                  <Column header="Extrato (banco)" body={extratoBody} />
                  <Column header="Sistema" body={sistemaBody} />
                  <Column
                    header="Diferença"
                    body={(row) => dashboardCellMono(formatMoney(row.diferenca))}
                    style={{ width: "7.5rem" }}
                  />
                  <Column
                    header="Justificativa"
                    body={(row) => dashboardCellText(row.justificativa ?? "—")}
                    style={{ minWidth: "10rem" }}
                  />
                </DataTable>
              </DashboardDataTableShell>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
