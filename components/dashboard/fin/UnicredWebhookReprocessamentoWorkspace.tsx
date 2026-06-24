"use client";

import { useCallback, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputNumber } from "primereact/inputnumber";
import { toast } from "sonner";
import { AlertTriangle, FlaskConical, Play, RefreshCw } from "lucide-react";
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
  type UnicredWebhookReprocessamentoLoteItem,
  type UnicredWebhookReprocessamentoLoteResponse,
} from "@/lib/fin-service";
import { notifyUnicredWebhookPendentesChanged } from "@/hooks/use-unicred-webhook-pendentes";

const CARD_CLASS = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";

const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50";

const BTN_WARN =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-50";

const SITUACAO_LABELS: Record<string, string> = {
  DESCRIPTOGRAFADO: "Descriptografado",
  PROCESSADO: "Processado",
  PENDENTE_CONCILIACAO: "Pendente conciliação",
  SEM_CHAVE: "Sem chave",
  FALHA_PROCESSAMENTO: "Falha",
};

const SITUACAO_TONES: Record<string, string> = {
  DESCRIPTOGRAFADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  PROCESSADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  PENDENTE_CONCILIACAO: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  SEM_CHAVE: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  FALHA_PROCESSAMENTO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

type ExecucaoLog = {
  id: string;
  executadoEm: string;
  dryRun: boolean;
  limite: number;
  resposta: UnicredWebhookReprocessamentoLoteResponse;
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function situacaoBadge(situacao: string) {
  const label = SITUACAO_LABELS[situacao] ?? situacao;
  return dashboardStatusBadge(label, SITUACAO_TONES, situacao);
}

export function UnicredWebhookReprocessamentoWorkspace() {
  const [limite, setLimite] = useState<number>(200);
  const [running, setRunning] = useState<"simular" | "executar" | null>(null);
  const [historico, setHistorico] = useState<ExecucaoLog[]>([]);
  const [selecionado, setSelecionado] = useState<ExecucaoLog | null>(null);

  const executar = useCallback(async (dryRun: boolean) => {
    const limiteEfetivo = Math.min(Math.max(limite || 200, 1), 500);
    if (!dryRun) {
      const ok = window.confirm(
        `Executar reprocessamento de até ${limiteEfetivo} webhooks com falha de autenticação? ` +
          "Títulos elegíveis serão liquidados automaticamente.",
      );
      if (!ok) return;
    }

    setRunning(dryRun ? "simular" : "executar");
    try {
      const resposta = await finService.reprocessarUnicredWebhookFalhasAuth(
        { limite: limiteEfetivo, dryRun },
        { skipLoading: true },
      );
      const entrada: ExecucaoLog = {
        id: crypto.randomUUID(),
        executadoEm: new Date().toISOString(),
        dryRun,
        limite: limiteEfetivo,
        resposta,
      };
      setHistorico((prev) => [entrada, ...prev].slice(0, 20));
      setSelecionado(entrada);

      if (dryRun) {
        toast.success(
          `Simulação: ${resposta.descriptografados}/${resposta.candidatos} descriptografados`,
        );
      } else {
        toast.success(
          `Concluído: ${resposta.processados} processados, ${resposta.falhas} falhas`,
        );
        notifyUnicredWebhookPendentesChanged();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao reprocessar webhooks");
    } finally {
      setRunning(null);
    }
  }, [limite]);

  const resposta = selecionado?.resposta ?? null;
  const itens = resposta?.itens ?? [];

  return (
    <div className="flex flex-col gap-6 px-4">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md space-y-2">
            <p className={FORM_LABEL_CLASS}>Parâmetros</p>
            <label className="block space-y-2">
              <span className="text-sm text-white/60">Limite por execução (máx. 500)</span>
              <InputNumber
                value={limite}
                onValueChange={(e) => setLimite(e.value ?? 200)}
                min={1}
                max={500}
                className="w-full"
                inputClassName="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white"
              />
            </label>
            <p className="text-xs leading-relaxed text-white/35">
              Busca webhooks com autenticação inválida e payload criptografado salvo. Tenta
              descriptografar com as chaves dos convênios Unicred ativos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={running !== null}
              onClick={() => executar(true)}
            >
              <FlaskConical size={14} />
              {running === "simular" ? "Simulando…" : "Simular"}
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={running !== null}
              onClick={() => executar(false)}
            >
              <Play size={14} />
              {running === "executar" ? "Executando…" : "Executar"}
            </button>
          </div>
        </div>
      </section>

      {resposta ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Candidatos", value: resposta.candidatos },
              { label: "Descriptografados", value: resposta.descriptografados },
              { label: "Processados", value: resposta.processados },
              { label: "Falhas", value: resposta.falhas },
              {
                label: "Modo",
                value: resposta.dryRun ? "Simulação" : "Produção",
              },
            ].map((stat) => (
              <div key={stat.label} className={cn(CARD_CLASS, "text-center")}>
                <p className={FORM_LABEL_CLASS}>{stat.label}</p>
                <p className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          {resposta.candidatos > 0 && resposta.descriptografados === 0 ? (
            <div
              className={cn(
                CARD_CLASS,
                "flex items-start gap-3 border-amber-500/25 bg-amber-500/5 text-amber-100/90",
              )}
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm leading-relaxed">
                Nenhum payload foi descriptografado. Verifique as chaves de webhook nos convênios
                Unicred ou use o relatório CSV do banco para liquidação manual.
              </p>
            </div>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Log da execução</h2>
                {selecionado ? (
                  <p className="text-xs text-white/40">
                    {formatDateTime(selecionado.executadoEm)}
                    {selecionado.dryRun ? " · simulação" : " · produção"}
                    {" · limite "}
                    {selecionado.limite}
                    {resposta.candidatos > itens.length
                      ? ` · exibindo ${itens.length} de ${resposta.candidatos} itens`
                      : null}
                  </p>
                ) : null}
              </div>
            </div>

            <DashboardDataTableShell>
              <DataTable
                value={itens}
                dataKey="logId"
                emptyMessage="Nenhum item no log desta execução."
                className={DASHBOARD_DATATABLE_CLASS}
                pt={dashboardDataTablePt({ density: "compact", paginator: itens.length > 15 })}
                paginator={itens.length > 15}
                rows={15}
              >
                <Column
                  field="situacao"
                  header="Situação"
                  body={(row: UnicredWebhookReprocessamentoLoteItem) =>
                    situacaoBadge(row.situacao)
                  }
                  style={{ width: "10rem" }}
                />
                <Column
                  field="logId"
                  header="Log"
                  body={(row: UnicredWebhookReprocessamentoLoteItem) =>
                    dashboardCellMono(row.logId?.slice(0, 8) ?? "—")
                  }
                  style={{ width: "6rem" }}
                />
                <Column
                  field="codigoMovimento"
                  header="Mov."
                  body={(row: UnicredWebhookReprocessamentoLoteItem) =>
                    dashboardCellMono(row.codigoMovimento ?? "—")
                  }
                  style={{ width: "4rem" }}
                />
                <Column
                  field="convenioId"
                  header="Convênio"
                  body={(row: UnicredWebhookReprocessamentoLoteItem) =>
                    dashboardCellMono(row.convenioId?.slice(0, 8) ?? "—")
                  }
                  style={{ width: "6rem" }}
                />
                <Column
                  field="mensagem"
                  header="Mensagem"
                  body={(row: UnicredWebhookReprocessamentoLoteItem) =>
                    dashboardCellText(row.mensagem ?? "—")
                  }
                />
              </DataTable>
            </DashboardDataTableShell>

            <details className={CARD_CLASS}>
              <summary className="cursor-pointer text-sm font-medium text-white/70">
                Resposta JSON completa
              </summary>
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-emerald-200/90">
                {JSON.stringify(resposta, null, 2)}
              </pre>
            </details>
          </section>
        </>
      ) : (
        <section className={cn(CARD_CLASS, "text-center text-white/35")}>
          <RefreshCw className="mx-auto mb-3 opacity-40" size={28} />
          <p className="text-sm">Execute uma simulação ou o reprocessamento para ver o log aqui.</p>
        </section>
      )}

      {historico.length > 1 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">
            Execuções anteriores
          </h2>
          <div className="flex flex-wrap gap-2">
            {historico.map((exec) => (
              <button
                key={exec.id}
                type="button"
                className={cn(
                  BTN_WARN,
                  selecionado?.id === exec.id && "ring-1 ring-amber-400/50",
                )}
                onClick={() => setSelecionado(exec)}
              >
                {formatDateTime(exec.executadoEm)}
                {exec.dryRun ? " · sim" : " · exec"}
                {" · "}
                {exec.resposta.processados}/{exec.resposta.candidatos}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
