"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { CloudDownload, RefreshCw } from "lucide-react";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { finService, type IndiceEconomicoMensal } from "@/lib/fin-service";
import { isAdmin } from "@/lib/auth-storage";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";

const TABLE_PT = dashboardDataTablePt({ density: "compact" });

const PERIODO_OPCOES = [
  { label: "Últimos 12 meses", value: 12 },
  { label: "Últimos 24 meses", value: 24 },
  { label: "Últimos 36 meses", value: 36 },
  { label: "Últimos 60 meses", value: 60 },
] as const;

function formatMesReferencia(ano: number, mes: number): string {
  const data = new Date(ano, mes - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatPercentual(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatNumeroIndice(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function periodoParaQuery(meses: number): { desde: string; ate: string } {
  const ate = new Date();
  const desde = new Date(ate.getFullYear(), ate.getMonth() - (meses - 1), 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { desde: fmt(desde), ate: fmt(ate) };
}

export function IpcaIndiceList() {
  const [rows, setRows] = useState<IndiceEconomicoMensal[]>([]);
  const [ultimo, setUltimo] = useState<IndiceEconomicoMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [meses, setMeses] = useState<number>(24);
  const admin = isAdmin();

  const rowsOrdenados = useMemo(
    () => [...rows].sort((a, b) => b.anoMes - a.anoMes),
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const periodo = periodoParaQuery(meses);
      const [lista, ultimoMes] = await Promise.all([
        finService.listIndicesIpca(periodo),
        finService.getIndiceIpcaUltimo().catch(() => null),
      ]);
      setRows(lista);
      setUltimo(ultimoMes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar índices IPCA.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [meses]);

  useEffect(() => {
    void load();
  }, [load]);

  const sincronizar = async () => {
    setSyncing(true);
    try {
      const result = await finService.sincronizarIndicesIpca();
      if (result.status === "SUCESSO") {
        toast.success(
          `IPCA sincronizado: ${result.registrosNovos} novos, ${result.registrosAtualizados} atualizados.`,
        );
      } else if (result.status === "PARCIAL") {
        toast.warning(
          result.erro ??
            `Sync parcial: ${result.registrosNovos} novos, ${result.registrosAtualizados} atualizados.`,
        );
      } else {
        toast.error(result.erro ?? "Falha ao sincronizar IPCA.");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível sincronizar com o IBGE.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {ultimo ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Último mês</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMesReferencia(ultimo.ano, ultimo.mes)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Variação mensal</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatPercentual(ultimo.variacaoMensal)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Acumulado 12 meses</p>
            <p className="mt-1 text-lg font-semibold text-amber-300">
              {formatPercentual(ultimo.variacao12Meses)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ipca-periodo" className="text-xs font-bold uppercase tracking-widest text-white/40">
              Período
            </label>
            <Dropdown
              inputId="ipca-periodo"
              value={meses}
              options={[...PERIODO_OPCOES]}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setMeses(Number(e.value) || 24)}
              className="w-48"
              pt={{
                root: { className: "border-white/10 bg-white/[0.05]" },
                input: { className: "text-sm text-white" },
              }}
            />
          </div>
          <p className="pb-2 text-sm text-white/50">
            Fonte: IBGE SIDRA (tabela 1737). Usado no reajuste anual de parcelas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            icon={<RefreshCw size={16} />}
            label="Atualizar"
            severity="secondary"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
          {admin ? (
            <Button
              type="button"
              icon={<CloudDownload size={16} />}
              label="Sincronizar IBGE"
              loading={syncing}
              onClick={() => void sincronizar()}
            />
          ) : null}
        </div>
      </div>

      <DashboardDataTableShell className={DASHBOARD_DATATABLE_SHELL_CLASS}>
        <DataTable
          value={rowsOrdenados}
          loading={loading}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          paginator
          rows={12}
          rowsPerPageOptions={[12, 24, 48]}
          emptyMessage="Nenhum índice IPCA sincronizado. Peça a um administrador para sincronizar com o IBGE."
          rowClassName={() => "text-white/90"}
        >
          <Column
            header="Referência"
            body={(r: IndiceEconomicoMensal) =>
              dashboardCellText(formatMesReferencia(r.ano, r.mes))
            }
          />
          <Column
            header="Var. mensal"
            body={(r: IndiceEconomicoMensal) =>
              dashboardCellMono(formatPercentual(r.variacaoMensal))
            }
          />
          <Column
            header="Acum. 12 meses"
            body={(r: IndiceEconomicoMensal) =>
              dashboardCellMono(formatPercentual(r.variacao12Meses))
            }
          />
          <Column
            header="Nº índice"
            body={(r: IndiceEconomicoMensal) =>
              dashboardCellMono(formatNumeroIndice(r.numeroIndice))
            }
          />
          <Column
            header="Sincronizado em"
            body={(r: IndiceEconomicoMensal) =>
              dashboardCellMono(formatBusinessDateTimeWithSeconds(r.sincronizadoEm))
            }
          />
        </DataTable>
      </DashboardDataTableShell>
    </div>
  );
}
