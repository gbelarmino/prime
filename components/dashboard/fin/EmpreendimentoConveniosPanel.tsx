"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "sonner";
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
    <span
      className="block min-w-0 max-w-full truncate font-mono text-[12px] tabular-nums text-white/85"
      title={t}
    >
      {t}
    </span>
  );
}

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: true });

const VINCULO_TONES: Record<string, string> = {
  Configurado: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  Pendente: "border-amber-500/25 bg-amber-500/15 text-amber-300",
};

type RowDraft = EmpreendimentoConvenioItem & { draftConvenioId: string | null };

export function EmpreendimentoConveniosPanel() {
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNome, setSavingNome] = useState<string | null>(null);

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
    setLoading(true);
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
    } finally {
      setLoading(false);
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
          loading={loading}
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
            body={(r: RowDraft) => dashboardCellText(r.nomeEmpreendimento)}
          />
          <Column
            header="Status"
            body={(r: RowDraft) =>
              dashboardStatusBadge(r.convenioId ? "Configurado" : "Pendente", VINCULO_TONES)
            }
          />
          <Column
            header="Beneficiário"
            style={{ width: "11rem", maxWidth: "11rem" }}
            bodyClassName="min-w-0 overflow-hidden"
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
                className="w-full min-w-0 max-w-[11rem]"
                panelClassName="max-w-[min(24rem,90vw)]"
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
            body={(r: RowDraft) =>
              cellOuTraco(convenioPorId(convenios, r.draftConvenioId)?.agencia)
            }
          />
          <Column
            header="Conta"
            body={(r: RowDraft) =>
              cellMonoOuTraco(convenioPorId(convenios, r.draftConvenioId)?.conta)
            }
          />
          <Column
            header="Var. carteira"
            body={(r: RowDraft) =>
              cellMonoOuTraco(convenioPorId(convenios, r.draftConvenioId)?.variacaoCarteira)
            }
          />
          <Column
            header="Cooperativa"
            body={(r: RowDraft) =>
              cellOuTraco(convenioPorId(convenios, r.draftConvenioId)?.cooperativa)
            }
          />
          <Column
            header="Ações"
            style={{ width: "11rem" }}
            body={(r: RowDraft) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  label="Salvar"
                  size="small"
                  loading={savingNome === r.nomeEmpreendimento}
                  disabled={!r.draftConvenioId || r.draftConvenioId === r.convenioId}
                  onClick={() => void salvar(r)}
                />
                {r.convenioId && (
                  <Button
                    type="button"
                    label="Remover"
                    size="small"
                    severity="secondary"
                    outlined
                    loading={savingNome === r.nomeEmpreendimento}
                    onClick={() => void remover(r)}
                  />
                )}
              </div>
            )}
          />
        </DataTable>
      </div>
    </div>
  );
}
