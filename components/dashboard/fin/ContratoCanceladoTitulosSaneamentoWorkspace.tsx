"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "sonner";
import { AlertTriangle, FlaskConical, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import {
  finService,
  type ContratoCanceladoTitulosSaneamentoContratoItem,
  type ContratoCanceladoTitulosSaneamentoResponse,
  type ContratoCanceladoTitulosSaneamentoTituloItem,
} from "@/lib/fin-service";
import { isAdmin } from "@/lib/auth-storage";

const CARD_CLASS = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";

const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:pointer-events-none disabled:opacity-50";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50";

const RESULTADO_TONES: Record<string, string> = {
  PREVISTO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  OK: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  CANCELADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  FALHA: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  FALHA_PARCIAL: "border-amber-500/25 bg-amber-500/15 text-amber-300",
};

export function ContratoCanceladoTitulosSaneamentoWorkspace() {
  const [running, setRunning] = useState<"simular" | "executar" | null>(null);
  const [resposta, setResposta] = useState<ContratoCanceladoTitulosSaneamentoResponse | null>(null);
  const [selecionados, setSelecionados] = useState<ContratoCanceladoTitulosSaneamentoContratoItem[]>([]);
  const [contratoExpandido, setContratoExpandido] =
    useState<ContratoCanceladoTitulosSaneamentoContratoItem | null>(null);
  const [executarConfirmOpen, setExecutarConfirmOpen] = useState(false);
  const admin = isAdmin();

  const carregarPreview = useCallback(async () => {
    if (!admin) return;
    setRunning("simular");
    try {
      const data = await finService.sanearTitulosContratosCancelados(
        { dryRun: true },
        { skipLoading: true },
      );
      setResposta(data);
      setSelecionados([]);
      setContratoExpandido(null);
      toast.success(
        data.contratos === 0
          ? "Nenhum título aberto em contrato cancelado."
          : `${data.contratos} contrato(s), ${data.titulosPrevistos} título(s) elegível(is).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar preview.");
    } finally {
      setRunning(null);
    }
  }, [admin]);

  useEffect(() => {
    void carregarPreview();
  }, [carregarPreview]);

  const contratoIdsSelecionados = useMemo(
    () => selecionados.map((c) => c.contratoId),
    [selecionados],
  );

  const executar = useCallback(
    async (dryRun: boolean) => {
      setRunning(dryRun ? "simular" : "executar");
      try {
        const payload = {
          dryRun,
          contratoIds:
            !dryRun && contratoIdsSelecionados.length > 0
              ? contratoIdsSelecionados
              : undefined,
        };
        const data = await finService.sanearTitulosContratosCancelados(payload, {
          skipLoading: true,
        });
        setResposta(data);
        setSelecionados([]);
        setContratoExpandido(null);
        if (dryRun) {
          toast.success(
            `${data.contratos} contrato(s) · ${data.titulosPrevistos} título(s) previstos`,
          );
        } else {
          toast.success(
            `Concluído: ${data.titulosCancelados} cancelado(s), ${data.titulosComFalha} falha(s)`,
          );
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha no saneamento.");
      } finally {
        setRunning(null);
      }
    },
    [contratoIdsSelecionados],
  );

  if (!admin) {
    return (
      <div className={cn(CARD_CLASS, "text-sm text-white/50")}>
        Apenas administradores podem executar este saneamento.
      </div>
    );
  }

  const itens = resposta?.itens ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-2">
            <p className={FORM_LABEL_CLASS}>Manutenção</p>
            <p className="text-sm leading-relaxed text-white/55">
              Contratos já cancelados que ainda têm títulos em aberto. Emitidos no banco seguem
              baixa Unicred; demais são cancelados só no Aires, com observação no histórico.
            </p>
            <p className="text-xs leading-relaxed text-white/35">
              Simular não altera dados. Executar com linhas selecionadas restringe o lote; sem
              seleção, processa todos os elegíveis.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={running !== null}
              onClick={() => void executar(true)}
            >
              {running === "simular" ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              {running === "simular" ? "Simulando…" : "Simular"}
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={running !== null || (resposta?.titulosPrevistos ?? 0) < 1}
              onClick={() => setExecutarConfirmOpen(true)}
            >
              <Play size={14} />
              {running === "executar" ? "Executando…" : "Executar"}
            </button>
          </div>
        </div>
      </section>

      {resposta ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Contratos", value: resposta.contratos },
            { label: "Títulos previstos", value: resposta.titulosPrevistos },
            { label: "Cancelados", value: resposta.titulosCancelados },
            { label: "Falhas", value: resposta.titulosComFalha },
            { label: "Modo", value: resposta.dryRun ? "Simulação" : "Produção" },
          ].map((stat) => (
            <div key={stat.label} className={cn(CARD_CLASS, "text-center")}>
              <p className={FORM_LABEL_CLASS}>{stat.label}</p>
              <p className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {resposta && resposta.titulosPrevistos > 0 ? (
        <div
          className={cn(
            CARD_CLASS,
            "flex items-start gap-3 border-amber-500/25 bg-amber-500/5 text-amber-100/90",
          )}
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <p className="text-sm leading-relaxed">
            {resposta.dryRun
              ? "Há títulos elegíveis. Revise a lista e execute quando estiver pronto — a baixa Unicred é irreversível no banco."
              : resposta.titulosComFalha > 0
                ? "Alguns títulos falharam (ex.: baixa pendente). Reexecute após sincronizar status."
                : "Saneamento concluído. Reexecute Simular para confirmar que a fila zerou."}
          </p>
        </div>
      ) : null}

      <DashboardDataTableShell>
        <DataTable
          value={itens}
          selection={selecionados}
          onSelectionChange={(e) =>
            setSelecionados((e.value as ContratoCanceladoTitulosSaneamentoContratoItem[]) ?? [])
          }
          selectionMode="checkbox"
          dataKey="contratoId"
          emptyMessage="Nenhum contrato cancelado com título aberto."
          className={DASHBOARD_DATATABLE_CLASS}
          pt={dashboardDataTablePt({ paginator: false })}
          rowClassName={() => "cursor-pointer"}
          onRowClick={(e) =>
            setContratoExpandido(e.data as ContratoCanceladoTitulosSaneamentoContratoItem)
          }
        >
          <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
          <Column
            header="Contrato"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellMono(row.numeroContrato ?? String(row.contratoId))
            }
          />
          <Column
            header="ID"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellMono(String(row.contratoId))
            }
            style={{ width: "5rem" }}
          />
          <Column
            header="Títulos"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellText(String(row.titulos))
            }
            style={{ width: "5rem" }}
          />
          <Column
            header="No banco"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellText(String(row.canceladosNoBanco))
            }
            style={{ width: "6rem" }}
          />
          <Column
            header="Só Aires"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellText(String(row.canceladosSoSistema))
            }
            style={{ width: "6rem" }}
          />
          <Column
            header="Resultado"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardStatusBadge(row.resultado, RESULTADO_TONES, row.resultado)
            }
            style={{ width: "8rem" }}
          />
          <Column
            header="Detalhe"
            body={(row: ContratoCanceladoTitulosSaneamentoContratoItem) =>
              dashboardCellText(row.mensagem ?? "—")
            }
          />
        </DataTable>
      </DashboardDataTableShell>

      {contratoExpandido ? (
        <section className={CARD_CLASS}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={FORM_LABEL_CLASS}>Títulos do contrato</p>
              <p className="mt-1 font-mono text-sm text-white">
                {contratoExpandido.numeroContrato ?? contratoExpandido.contratoId}
              </p>
            </div>
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => setContratoExpandido(null)}
            >
              Fechar
            </button>
          </div>
          <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
            <DataTable
              value={contratoExpandido.titulosDetalhe}
              emptyMessage="Sem títulos."
              className={DASHBOARD_DATATABLE_CLASS}
              pt={dashboardDataTablePt({ density: "compact", paginator: false })}
            >
              <Column
                header="Parcela"
                body={(row: ContratoCanceladoTitulosSaneamentoTituloItem) =>
                  dashboardCellMono(
                    row.numeroParcela != null ? String(row.numeroParcela) : "—",
                  )
                }
                style={{ width: "5rem" }}
              />
              <Column
                header="Status"
                body={(row: ContratoCanceladoTitulosSaneamentoTituloItem) =>
                  dashboardCellText(row.statusAnterior)
                }
              />
              <Column
                header="Canal"
                body={(row: ContratoCanceladoTitulosSaneamentoTituloItem) =>
                  dashboardCellText(row.cancelarNoBanco ? "Baixa no banco" : "Só no Aires")
                }
              />
              <Column
                header="Resultado"
                body={(row: ContratoCanceladoTitulosSaneamentoTituloItem) =>
                  dashboardStatusBadge(row.resultado, RESULTADO_TONES, row.resultado)
                }
              />
              <Column
                header="Obs."
                body={(row: ContratoCanceladoTitulosSaneamentoTituloItem) =>
                  dashboardCellText(row.detalhe ?? "—")
                }
              />
            </DataTable>
          </div>
        </section>
      ) : null}

      <DashboardConfirmDialog
        visible={executarConfirmOpen}
        onHide={() => setExecutarConfirmOpen(false)}
        onConfirm={async () => {
          setExecutarConfirmOpen(false);
          await executar(false);
        }}
        header="Executar saneamento"
        tone="warning"
        confirmLabel="Executar"
        loading={running === "executar"}
        message={
          <p>
            {contratoIdsSelecionados.length > 0 ? (
              <>
                Cancelar títulos abertos de{" "}
                <span className="font-semibold text-white">
                  {contratoIdsSelecionados.length}
                </span>{" "}
                contrato(s) selecionado(s)? Inclui baixa Unicred quando houver ID externo.
              </>
            ) : (
              <>
                Cancelar títulos abertos de todos os{" "}
                <span className="font-semibold text-white">{resposta?.contratos ?? 0}</span>{" "}
                contrato(s) elegíveis? Inclui baixa Unicred quando houver ID externo.
              </>
            )}
          </p>
        }
      />
    </div>
  );
}
