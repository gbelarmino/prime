"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "primereact/button";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { EmpreendimentoConveniosPanel } from "@/components/dashboard/fin/EmpreendimentoConveniosPanel";
import { finService, type ConvenioBanco } from "@/lib/fin-service";
import { convenioTipoLabel } from "@/lib/convenio-label";

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

function cellOuTraco(value: string | null | undefined) {
  const t = value?.trim();
  return dashboardCellText(t || "—");
}

function cellMonoOuTraco(value: string | null | undefined) {
  const t = value?.trim();
  return t ? dashboardCellMono(t) : dashboardCellText("—");
}

function cellBeneficiario(value: string | null | undefined) {
  const t = value?.trim();
  return t ? dashboardCellMono(t, { truncate: true }) : dashboardCellText("—");
}

const ATIVO_TONES: Record<string, string> = {
  Ativo: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  Inativo: "border-white/10 bg-white/10 text-white/45",
};

export function ConveniosBancoList() {
  const [rows, setRows] = useState<ConvenioBanco[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const lista = await finService.listConveniosGestao();
      setRows(lista);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar convênios.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAtivo = async (row: ConvenioBanco, ativo: boolean) => {
    setSavingId(row.id);
    try {
      const atualizado = await finService.setConvenioAtivo(row.id, ativo);
      setRows((prev) => prev.map((c) => (c.id === row.id ? atualizado : c)));
      toast.success(ativo ? "Convênio ativado." : "Convênio desativado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o convênio.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          Convênios inativos não aparecem em títulos, conciliação nem atendimento.
        </p>
        <Button
          type="button"
          icon={<RefreshCw size={16} />}
          label="Atualizar"
          severity="secondary"
          outlined
          onClick={() => void load()}
        />
      </div>

      <DashboardDataTableShell className={DASHBOARD_DATATABLE_SHELL_CLASS}>
        <DataTable
          value={rows}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          emptyMessage="Nenhum convênio cadastrado."
          rowClassName={() => "text-white/90"}
        >
          <Column
            field="nome"
            header="Nome"
            body={(r: ConvenioBanco) => dashboardCellText(r.nome)}
          />
          <Column
            field="tipoIntegracao"
            header="Integração"
            body={(r: ConvenioBanco) => dashboardCellText(convenioTipoLabel(r.tipoIntegracao))}
          />
          <Column
            field="codigoBanco"
            header="Banco"
            body={(r: ConvenioBanco) => dashboardCellText(r.codigoBanco || "—")}
          />
          <Column
            field="agencia"
            header="Agência"
            body={(r: ConvenioBanco) => cellOuTraco(r.agencia)}
          />
          <Column
            field="conta"
            header="Conta"
            body={(r: ConvenioBanco) => cellMonoOuTraco(r.conta)}
          />
          <Column
            field="variacaoCarteira"
            header="Var. carteira"
            body={(r: ConvenioBanco) => cellMonoOuTraco(r.variacaoCarteira)}
          />
          <Column
            field="cooperativa"
            header="Cooperativa"
            body={(r: ConvenioBanco) => cellOuTraco(r.cooperativa)}
          />
          <Column
            field="nomeBeneficiario"
            header="Nome beneficiário"
            body={(r: ConvenioBanco) => cellOuTraco(r.nomeBeneficiario)}
          />
          <Column
            field="beneficiario"
            header="ID beneficiário"
            style={{ width: "10.5rem", maxWidth: "10.5rem" }}
            bodyClassName="!max-w-[10.5rem] min-w-0 overflow-hidden"
            body={(r: ConvenioBanco) => cellBeneficiario(r.beneficiario)}
          />
          <Column
            header="Status"
            body={(r: ConvenioBanco) =>
              dashboardStatusBadge(r.ativo ? "Ativo" : "Inativo", ATIVO_TONES)
            }
          />
          <Column
            header="Ativo"
            style={{ width: "6rem" }}
            body={(r: ConvenioBanco) => (
              <InputSwitch
                checked={r.ativo}
                disabled={savingId === r.id}
                onChange={(e) => void toggleAtivo(r, Boolean(e.value))}
              />
            )}
          />
        </DataTable>
      </DashboardDataTableShell>

      <EmpreendimentoConveniosPanel />
    </div>
  );
}
