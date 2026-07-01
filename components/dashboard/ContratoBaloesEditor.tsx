"use client";

import { useMemo } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { BrlMoneyInput } from "@/components/dashboard/BrlMoneyInput";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import {
  emptyBalaoRow,
  previewBaloesContrato,
  reindexBaloes,
} from "@/lib/contrato-baloes";
import { cn } from "@/lib/utils";
import type { BalaoContratoFormRow } from "@/lib/validations/contrato-honorarios";

const REAJUSTE_OPTIONS = [
  { label: "A definir", value: "" },
  { label: "Sim", value: "sim" },
  { label: "Não", value: "nao" },
];

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

type Props = {
  baloes: BalaoContratoFormRow[];
  onChange: (baloes: BalaoContratoFormRow[]) => void;
  numParcelasMensais: string;
  dataPrimeiraParcela: string;
  diaVencimento: string;
  disabled?: boolean;
  errorMessage?: string;
  compact?: boolean;
};

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContratoBaloesEditor({
  baloes,
  onChange,
  numParcelasMensais,
  dataPrimeiraParcela,
  diaVencimento,
  disabled = false,
  errorMessage,
  compact = false,
}: Props) {
  const preview = useMemo(
    () =>
      previewBaloesContrato({
        baloes,
        numParcelasMensais,
        dataPrimeiraParcela,
        diaVencimento,
      }),
    [baloes, numParcelasMensais, dataPrimeiraParcela, diaVencimento],
  );

  const updateRow = (ordem: number, patch: Partial<BalaoContratoFormRow>) => {
    onChange(
      baloes.map((r) => (r.ordem === ordem ? { ...r, ...patch } : r)),
    );
  };

  const addBalao = () => {
    onChange(reindexBaloes([...baloes, emptyBalaoRow(baloes.length + 1)]));
  };

  const removeBalao = (ordem: number) => {
    onChange(reindexBaloes(baloes.filter((r) => r.ordem !== ordem)));
  };

  const shellClass = compact ? DASHBOARD_DATATABLE_INSET_SHELL_CLASS : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/55">
          Série paralela às parcelas mensais. O vencimento coincide com a parcela de referência.
        </p>
        {!disabled && (
          <Button
            type="button"
            label="Adicionar balão"
            icon="pi pi-plus"
            size="small"
            outlined
            className="p-button-sm"
            onClick={addBalao}
          />
        )}
      </div>

      {errorMessage ? (
        <Message severity="error" text={errorMessage} className="w-full" />
      ) : null}

      {baloes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/40">
          Nenhum balão configurado.
        </p>
      ) : (
        <DashboardDataTableShell className={shellClass}>
          <DataTable
            value={baloes}
            dataKey="ordem"
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            emptyMessage="Nenhum balão"
          >
            <Column
              header="#"
              body={(row: BalaoContratoFormRow) => dashboardCellMono(`B${row.ordem}`)}
              style={{ width: "4rem" }}
            />
            <Column
              header="Valor (R$)"
              body={(row: BalaoContratoFormRow) => (
                <BrlMoneyInput
                  value={row.valor}
                  onChange={(v) => updateRow(row.ordem, { valor: v })}
                  disabled={disabled}
                  className="w-full min-w-[8rem]"
                />
              )}
            />
            <Column
              header="Vence com parcela"
              body={(row: BalaoContratoFormRow) => (
                <InputText
                  value={row.parcelaReferencia}
                  onChange={(e) =>
                    updateRow(row.ordem, { parcelaReferencia: e.target.value.replace(/\D/g, "") })
                  }
                  disabled={disabled}
                  placeholder="Ex.: 15"
                  className="w-full max-w-[6rem] tabular-nums"
                />
              )}
              style={{ width: "9rem" }}
            />
            <Column
              header="Reajuste"
              body={(row: BalaoContratoFormRow) => (
                <Dropdown
                  value={row.reajusteIndice ?? ""}
                  options={REAJUSTE_OPTIONS}
                  onChange={(e) => updateRow(row.ordem, { reajusteIndice: e.value })}
                  disabled={disabled}
                  className="w-full min-w-[8rem]"
                />
              )}
              style={{ width: "10rem" }}
            />
            {!disabled ? (
              <Column
                header=""
                body={(row: BalaoContratoFormRow) => (
                  <Button
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    aria-label={`Remover balão ${row.ordem}`}
                    onClick={() => removeBalao(row.ordem)}
                  />
                )}
                style={{ width: "3rem" }}
              />
            ) : null}
          </DataTable>
        </DashboardDataTableShell>
      )}

      {preview.length > 0 ? (
        <div className={cn("flex flex-col gap-2", compact ? "mt-1" : "mt-2")}>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Preview de vencimentos</h4>
          <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
            <DataTable
              value={preview}
              dataKey="ordem"
              className={DASHBOARD_DATATABLE_CLASS}
              pt={TABLE_PT}
            >
              <Column
                header="Balão"
                body={(row) => dashboardCellMono(`B${row.ordem}`)}
                style={{ width: "5rem" }}
              />
              <Column
                header="Valor"
                body={(row) => dashboardCellMono(formatBrl(row.valor))}
              />
              <Column
                header="Ref."
                body={(row) => dashboardCellText(`Parcela ${row.parcelaReferencia}`)}
                style={{ width: "6rem" }}
              />
              <Column
                header="Vencimento"
                body={(row) => dashboardCellText(row.vencimentoLabel)}
              />
              <Column
                header="Reajuste"
                body={(row) => dashboardCellText(row.reajusteLabel)}
                style={{ width: "7rem" }}
              />
            </DataTable>
          </DashboardDataTableShell>
        </div>
      ) : null}
    </div>
  );
}
