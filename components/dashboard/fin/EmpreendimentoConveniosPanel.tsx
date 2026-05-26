"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { CheckCircle2, Clock, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardActionMenuItem,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
} from "@/lib/dashboard-datatable";
import {
  finService,
  type ConvenioBanco,
  type EmpreendimentoConvenioItem,
} from "@/lib/fin-service";
import { convenioEmpreendimentoDropdownOptions } from "@/lib/convenio-label";

type ConvenioSelectOption = { label: string; value: string };

function convenioPorId(
  convenios: ConvenioBanco[],
  id: string | null | undefined,
): ConvenioBanco | undefined {
  if (!id) return undefined;
  return convenios.find((c) => c.id === id);
}

function cellOuTraco(value: string | null | undefined) {
  const t = value?.trim();
  return dashboardCellText(t || "—");
}

function cellMonoOuTraco(value: string | null | undefined) {
  const t = value?.trim();
  return t ? dashboardCellMono(t) : dashboardCellText("—");
}

function selectBeneficiarioTemplate(label: string | null | undefined) {
  const t = label?.trim();
  if (!t) {
    return <span className="block truncate text-sm text-white/40">Selecione beneficiário</span>;
  }
  return (
    <span className="block min-w-0 max-w-full truncate text-sm text-white/85" title={t}>
      {t}
    </span>
  );
}

const VINCULO_STATUS_ICON_SIZE = 24;

function vinculoStatusIcon(configurado: boolean) {
  const label = configurado ? "Configurado" : "Pendente";
  const Icon = configurado ? CheckCircle2 : Clock;
  return (
    <span
      className="inline-flex items-center justify-center"
      title={label}
      aria-label={label}
    >
      <Icon
        size={VINCULO_STATUS_ICON_SIZE}
        className={cn(
          "shrink-0",
          configurado ? "text-emerald-400" : "text-amber-400",
        )}
        aria-hidden
      />
    </span>
  );
}

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: true });

type RowDraft = EmpreendimentoConvenioItem & { draftConvenioId: string | null };

export function EmpreendimentoConveniosPanel() {
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [savingNome, setSavingNome] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<RowDraft | null>(null);
  const menuRef = useRef<Menu>(null);

  const convenioOptions = useMemo<ConvenioSelectOption[]>(
    () => convenioEmpreendimentoDropdownOptions(convenios),
    [convenios],
  );

  const labelConvenioSelecionado = useCallback(
    (convenioId: string | null | undefined) => {
      if (!convenioId) return null;
      return convenioOptions.find((o) => o.value === convenioId)?.label ?? null;
    },
    [convenioOptions],
  );

  const load = useCallback(async () => {
    try {
      const [lista, conv] = await Promise.all([
        finService.listEmpreendimentoConvenios(),
        finService.listConveniosGestao(),
      ]);
      setConvenios(conv);
      setRows(
        lista.map((r) => ({
          ...r,
          draftConvenioId: r.convenioId,
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar vínculos.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const salvar = async (row: RowDraft) => {
    if (!row.draftConvenioId) {
      toast.error("Selecione um convênio ativo.");
      return;
    }
    setSavingNome(row.nomeEmpreendimento);
    try {
      const atualizado = await finService.vincularEmpreendimentoConvenio(
        row.nomeEmpreendimento,
        row.draftConvenioId,
      );
      setRows((prev) =>
        prev.map((r) =>
          r.nomeEmpreendimento === row.nomeEmpreendimento
            ? { ...atualizado, draftConvenioId: atualizado.convenioId }
            : r,
        ),
      );
      toast.success("Vínculo salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSavingNome(null);
    }
  };

  const remover = async (row: RowDraft) => {
    setSavingNome(row.nomeEmpreendimento);
    try {
      await finService.removerVinculoEmpreendimentoConvenio(row.nomeEmpreendimento);
      setRows((prev) =>
        prev.map((r) =>
          r.nomeEmpreendimento === row.nomeEmpreendimento
            ? {
                ...r,
                convenioId: null,
                convenioNome: null,
                convenioAtivo: false,
                draftConvenioId: null,
              }
            : r,
        ),
      );
      toast.success("Vínculo removido.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover.");
    } finally {
      setSavingNome(null);
    }
  };

  const getRowActionItems = (row: RowDraft): MenuItem[] => {
    const busy = savingNome === row.nomeEmpreendimento;
    const podeSalvar = Boolean(row.draftConvenioId) && row.draftConvenioId !== row.convenioId;
    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Salvar vínculo",
        icon: <Save size={16} className="text-emerald-400 transition-transform group-hover:scale-110" />,
        labelClassName: "text-emerald-300/90",
        onClick: () => void salvar(row),
        disabled: busy || !podeSalvar,
      }),
    ];
    if (row.convenioId) {
      items.push(
        dashboardActionMenuItem({
          label: "Remover vínculo",
          icon: <Trash2 size={16} className="text-rose-400 transition-transform group-hover:scale-110" />,
          labelClassName: "text-rose-300/90",
          onClick: () => void remover(row),
          disabled: busy,
        }),
      );
    }
    return items;
  };

  const actionBodyTemplate = (row: RowDraft) =>
    dashboardRowActionsCell((e: MouseEvent<HTMLButtonElement>) => {
      setSelectedRow(row);
      menuRef.current?.toggle(e);
    });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">
          Empreendimentos → convênio
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Cada nome de empreendimento (cadastro de imóveis) usa um único convênio. Emissão de
          boletos e renegociação não permitem escolher outro banco.
        </p>
      </div>

      <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
        <DataTable
          value={rows}
          paginator
          rows={12}
          className={DASHBOARD_DATATABLE_CLASS}
          pt={TABLE_PT}
          emptyMessage="Nenhum empreendimento cadastrado em imóveis."
          rowClassName={() => "text-white/90"}
        >
          <Column
            field="nomeEmpreendimento"
            header="Empreendimento"
            style={{ width: "14%" }}
            body={(r: RowDraft) => dashboardCellText(r.nomeEmpreendimento)}
          />
          <Column
            header="Status"
            style={{ width: "4.5rem" }}
            bodyClassName="text-center"
            headerClassName="text-center"
            body={(r: RowDraft) => vinculoStatusIcon(Boolean(r.convenioId))}
          />
          <Column
            header="Beneficiário"
            style={{ width: "22rem", minWidth: "20rem" }}
            bodyClassName="min-w-0"
            body={(r: RowDraft) => (
              <Dropdown
                value={r.draftConvenioId}
                options={convenioOptions}
                optionLabel="label"
                optionValue="value"
                filter
                filterBy="label"
                showClear
                onChange={(e) => {
                  const id = (e.value as string | null) ?? null;
                  setRows((prev) =>
                    prev.map((x) =>
                      x.nomeEmpreendimento === r.nomeEmpreendimento
                        ? { ...x, draftConvenioId: id }
                        : x,
                    ),
                  );
                }}
                placeholder="Selecione beneficiário"
                className="w-full min-w-[18rem]"
                panelClassName="max-w-[min(32rem,92vw)]"
                valueTemplate={() =>
                  selectBeneficiarioTemplate(labelConvenioSelecionado(r.draftConvenioId))
                }
                itemTemplate={(opt: ConvenioSelectOption) =>
                  selectBeneficiarioTemplate(opt?.label)
                }
              />
            )}
          />
          <Column
            header="Agência"
            style={{ width: "5rem" }}
            body={(r: RowDraft) =>
              cellOuTraco(convenioPorId(convenios, r.draftConvenioId)?.agencia)
            }
          />
          <Column
            header="Conta"
            style={{ width: "6.5rem" }}
            body={(r: RowDraft) =>
              cellMonoOuTraco(convenioPorId(convenios, r.draftConvenioId)?.conta)
            }
          />
          <Column
            header="Var. carteira"
            style={{ width: "7rem" }}
            body={(r: RowDraft) =>
              cellOuTraco(convenioPorId(convenios, r.draftConvenioId)?.variacaoCarteira)
            }
          />
          <Column
            header="Cooperativa"
            style={{ width: "5.5rem" }}
            body={(r: RowDraft) =>
              cellOuTraco(convenioPorId(convenios, r.draftConvenioId)?.cooperativa)
            }
          />
          <Column
            header="Ações"
            align="right"
            style={{ width: "5rem" }}
            body={actionBodyTemplate}
          />
        </DataTable>

        <Menu
          model={selectedRow ? getRowActionItems(selectedRow) : []}
          popup
          ref={menuRef}
          pt={dashboardActionsMenuPt()}
        />
      </div>
    </div>
  );
}
