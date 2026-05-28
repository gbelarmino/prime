"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { MultiSelect } from "primereact/multiselect";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import {
  fetchFunilAcaoTipos,
  fetchFunilCardAcoesConfig,
  fetchFunilEtapas,
  fetchFunilEventos,
  saveFunilCardAcoes,
  type FunilCardAcaoCondicao,
  type FunilCardAcaoDto,
  type FunilCardAcaoSaveItem,
  type FunilEventoCodigo,
  type LeadTemperatura,
} from "@/lib/crm-service";
import { FUNIL_EVENTO_CARD_CLIQUE } from "@/lib/crm-funil-card-acoes";

const TEMPERATURA_OPTIONS: { label: string; value: LeadTemperatura }[] = [
  { label: "Frio", value: "FRIO" },
  { label: "Morno", value: "MORNO" },
  { label: "Quente", value: "QUENTE" },
];

type EditableAcao = FunilCardAcaoDto & {
  requerNaoCliente: boolean;
  etapaIds: number[];
  temperaturas: LeadTemperatura[];
};

function toEditable(row: FunilCardAcaoDto): EditableAcao {
  const c = row.condicao ?? {};
  return {
    ...row,
    requerNaoCliente: Boolean(c.requerNaoCliente),
    etapaIds: c.etapaIds ?? [],
    temperaturas: (c.temperaturas ?? []) as LeadTemperatura[],
  };
}

function toSaveItem(row: EditableAcao): FunilCardAcaoSaveItem {
  const condicao: FunilCardAcaoCondicao = {};
  if (row.requerNaoCliente) condicao.requerNaoCliente = true;
  if (row.etapaIds.length) condicao.etapaIds = row.etapaIds;
  if (row.temperaturas.length) condicao.temperaturas = row.temperaturas;

  return {
    acaoCodigo: row.acaoCodigo,
    eventoCodigo: row.eventoCodigo,
    rotulo: row.rotulo !== row.nomePadrao ? row.rotulo : null,
    ordem: row.ordem,
    ativo: row.ativo,
    condicao: Object.keys(condicao).length ? condicao : null,
  };
}

export function CrmFunilAcoesConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<{ codigo: string; nome: string; descricao: string | null }[]>([]);
  const [etapas, setEtapas] = useState<{ id: number; nome: string }[]>([]);
  const [rows, setRows] = useState<EditableAcao[]>([]);

  const eventosFuturos = useMemo(
    () => eventos.filter((e) => e.codigo !== FUNIL_EVENTO_CARD_CLIQUE),
    [eventos],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, et, cfg, tipos] = await Promise.all([
        fetchFunilEventos(),
        fetchFunilEtapas(),
        fetchFunilCardAcoesConfig(FUNIL_EVENTO_CARD_CLIQUE),
        fetchFunilAcaoTipos(FUNIL_EVENTO_CARD_CLIQUE),
      ]);
      setEventos(ev);
      setEtapas(et.map((e) => ({ id: e.id, nome: e.nome })));

      const cfgByCodigo = new Map(cfg.map((c) => [c.acaoCodigo, c]));
      const merged: EditableAcao[] = tipos.map((t) => {
        const existing = cfgByCodigo.get(t.codigo);
        if (existing) return toEditable(existing);
        return toEditable({
          id: 0,
          acaoCodigo: t.codigo,
          eventoCodigo: t.eventoCodigo as FunilEventoCodigo,
          rotulo: t.nome,
          nomePadrao: t.nome,
          descricao: t.descricao,
          icone: t.icone,
          tipoExibicao: t.tipoExibicao,
          ordem: t.ordemPadrao,
          ativo: true,
          condicao: t.condicaoPadrao,
        });
      });
      merged.sort((a, b) => a.ordem - b.ordem);
      setRows(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar configuração.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchRow(acaoCodigo: string, patch: Partial<EditableAcao>) {
    setRows((prev) =>
      prev.map((r) => (r.acaoCodigo === acaoCodigo ? { ...r, ...patch } : r)),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveFunilCardAcoes(
        FUNIL_EVENTO_CARD_CLIQUE,
        rows.map(toSaveItem),
      );
      setRows(saved.map(toEditable));
      toast.success("Ações do card salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400/90" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">
          Carregando ações
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-10">
      <header>
        <Link
          href="/dashboard/crm/funil"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar ao funil
        </Link>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          CRM · Funil
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white">
          Ações dos cards
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/45">
          Defina quais botões aparecem nos cards do Kanban, a ordem, rótulos e condições de exibição.
          O evento <strong className="text-white/70">Clique em ação do card</strong> dispara a
          execução no painel.
        </p>
      </header>

      <section className={DASHBOARD_DATATABLE_SHELL_CLASS}>
        <DataTable
          value={rows}
          dataKey="acaoCodigo"
          className={DASHBOARD_DATATABLE_CLASS}
          pt={dashboardDataTablePt({ density: "compact", paginator: false })}
          emptyMessage="Nenhuma ação configurada."
        >
          <Column
            header="Ativa"
            body={(row: EditableAcao) => (
              <Checkbox
                checked={row.ativo}
                onChange={(e) => patchRow(row.acaoCodigo, { ativo: Boolean(e.checked) })}
              />
            )}
            style={{ width: "4rem" }}
          />
          <Column field="nomePadrao" header="Ação" />
          <Column
            header="Rótulo no card"
            body={(row: EditableAcao) => (
              <InputText
                className="w-full min-w-[8rem]"
                value={row.rotulo}
                onChange={(e) => patchRow(row.acaoCodigo, { rotulo: e.target.value })}
              />
            )}
          />
          <Column
            header="Ordem"
            body={(row: EditableAcao) => (
              <InputNumber
                value={row.ordem}
                onValueChange={(e) =>
                  patchRow(row.acaoCodigo, { ordem: e.value ?? row.ordem })
                }
                className="w-20"
              />
            )}
            style={{ width: "6rem" }}
          />
          <Column
            header="Só se não for cliente"
            body={(row: EditableAcao) => (
              <Checkbox
                checked={row.requerNaoCliente}
                onChange={(e) =>
                  patchRow(row.acaoCodigo, { requerNaoCliente: Boolean(e.checked) })
                }
              />
            )}
          />
          <Column
            header="Etapas"
            body={(row: EditableAcao) => (
              <MultiSelect
                value={row.etapaIds}
                options={etapas}
                optionLabel="nome"
                optionValue="id"
                onChange={(e) => patchRow(row.acaoCodigo, { etapaIds: e.value ?? [] })}
                placeholder="Todas"
                display="chip"
                className="min-w-[10rem]"
                pt={dashboardMultiSelectPt()}
              />
            )}
          />
          <Column
            header="Temperaturas"
            body={(row: EditableAcao) => (
              <MultiSelect
                value={row.temperaturas}
                options={TEMPERATURA_OPTIONS}
                optionLabel="label"
                optionValue="value"
                onChange={(e) =>
                  patchRow(row.acaoCodigo, { temperaturas: e.value ?? [] })
                }
                placeholder="Todas"
                display="chip"
                className="min-w-[8rem]"
                pt={dashboardMultiSelectPt()}
              />
            )}
          />
        </DataTable>
      </section>

      <div className="flex justify-end">
        <Button
          label="Salvar configuração"
          icon={<Save size={16} />}
          loading={saving}
          onClick={() => void handleSave()}
        />
      </div>

      {eventosFuturos.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-sm font-semibold text-white">Eventos previstos (automação futura)</h2>
          <p className="mt-1 text-xs text-white/40">
            Estes eventos já estão catalogados para regras automáticas em versões seguintes.
          </p>
          <ul className="mt-4 space-y-3">
            {eventosFuturos.map((ev) => (
              <li
                key={ev.codigo}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{ev.nome}</p>
                <p className="mt-1 font-mono text-[10px] text-white/35">{ev.codigo}</p>
                {ev.descricao ? (
                  <p className="mt-2 text-xs text-white/45">{ev.descricao}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
