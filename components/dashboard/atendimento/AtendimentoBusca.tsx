"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTablePageEvent, type DataTableSortEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { toast } from "sonner";
import { Eye, Search } from "lucide-react";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  ATENDIMENTO_SITUACAO_FINANCEIRA_OPTIONS,
  ATENDIMENTO_STATUS_FINANCEIRO_TONES,
  atendimentoService,
  type AtendimentoBuscaFilters,
  type AtendimentoBuscaItem,
  type AtendimentoStatusFinanceiro,
} from "@/lib/atendimento-service";
import { finService } from "@/lib/fin-service";
import { isApiConfigured } from "@/lib/api-config";
import { formatCpfDisplay } from "@/lib/format-cpf";
import {
  DASHBOARD_DATATABLE_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import { springPageDisplayRange } from "@/lib/spring-page";
import type { SpringPage } from "@/lib/spring-page";

const PAGE_SIZE = 20;
const TABLE_PT = dashboardDataTablePt({ density: "default" });
const MULTISELECT_PT = dashboardMultiSelectPt();

type AtendimentoSortField =
  | "contratoId"
  | "numeroContrato"
  | "contratanteNome"
  | "cpf"
  | "empreendimento"
  | "saldoDevedor"
  | "percentualQuitacao"
  | "statusFinanceiro";

const DEFAULT_SORT_FIELD: AtendimentoSortField = "contratoId";
const DEFAULT_SORT_ORDER = -1;

const ATENDIMENTO_SORT_FIELDS = new Set<string>([
  "contratoId",
  "numeroContrato",
  "contratanteNome",
  "cpf",
  "empreendimento",
  "saldoDevedor",
  "percentualQuitacao",
  "statusFinanceiro",
]);

function isAtendimentoSortField(value: string): value is AtendimentoSortField {
  return ATENDIMENTO_SORT_FIELDS.has(value);
}

const FILTER_INPUT_CLASS = "w-full rounded-xl border-white/10 bg-white/5 text-white";

function nonEmptyArray<T>(v: T[] | null | undefined): T[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  return v;
}

function mergeUniqueSorted(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function mergeUniqueNumbers(existing: number[], incoming: number[]): number[] {
  return [...new Set([...existing, ...incoming])].sort((a, b) => a - b);
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function imovelLabel(row: AtendimentoBuscaItem): string {
  const parts = [row.empreendimento];
  if (row.quadra) parts.push(`Q. ${row.quadra}`);
  if (row.lote != null) parts.push(`Lt. ${row.lote}`);
  return parts.join(" · ");
}

export function AtendimentoBusca() {
  const router = useRouter();
  const [filters, setFilters] = useState<AtendimentoBuscaFilters>({});
  const [applied, setApplied] = useState<AtendimentoBuscaFilters>({});
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<AtendimentoSortField>(DEFAULT_SORT_FIELD);
  const [sortOrder, setSortOrder] = useState<1 | -1 | 0 | null | undefined>(DEFAULT_SORT_ORDER);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pageData, setPageData] = useState<SpringPage<AtendimentoBuscaItem> | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(true);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [lotes, setLotes] = useState<number[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);

  const selectedEmpreendimentos = filters.empreendimentos ?? [];
  const selectedQuadras = filters.quadras ?? [];

  useEffect(() => {
    setEmpreendimentosLoading(true);
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar empreendimentos.");
        setEmpreendimentos([]);
      })
      .finally(() => setEmpreendimentosLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEmpreendimentos.length === 0) {
      setQuadras([]);
      return;
    }
    setQuadrasLoading(true);
    void Promise.all(
      selectedEmpreendimentos.map((emp) =>
        finService.listQuadrasImovel({ empreendimento: emp }, { skipLoading: true }),
      ),
    )
      .then((lists) => {
        const items = mergeUniqueSorted([], lists.flat());
        setQuadras(items);
        setFilters((f) => {
          const nextQuadras = (f.quadras ?? []).filter((q) => items.includes(q));
          const nextLotes =
            nextQuadras.length === (f.quadras ?? []).length ? f.lotes : undefined;
          return { ...f, quadras: nextQuadras.length ? nextQuadras : undefined, lotes: nextLotes };
        });
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar quadras.");
        setQuadras([]);
      })
      .finally(() => setQuadrasLoading(false));
  }, [selectedEmpreendimentos.join("|")]);

  useEffect(() => {
    if (selectedEmpreendimentos.length === 0 || selectedQuadras.length === 0) {
      setLotes([]);
      return;
    }
    setLotesLoading(true);
    const pairs = selectedEmpreendimentos.flatMap((emp) =>
      selectedQuadras.map((qd) => ({ empreendimento: emp, quadra: qd })),
    );
    void Promise.all(
      pairs.map((p) => finService.listLotesImovel(p, { skipLoading: true })),
    )
      .then((lists) => {
        const items = mergeUniqueNumbers([], lists.flat());
        setLotes(items);
        setFilters((f) => {
          const nextLotes = (f.lotes ?? []).filter((n) => items.includes(n));
          return { ...f, lotes: nextLotes.length ? nextLotes : undefined };
        });
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar lotes.");
        setLotes([]);
      })
      .finally(() => setLotesLoading(false));
  }, [selectedEmpreendimentos.join("|"), selectedQuadras.join("|")]);

  const empreendimentoOptions = empreendimentos.map((emp) => ({ label: emp, value: emp }));
  const quadraOptions = quadras.map((q) => ({ label: `Quadra ${q}`, value: q }));
  const loteOptions = lotes.map((n) => ({ label: `Lote ${n}`, value: n }));

  const load = useCallback(async () => {
    if (!searched) return;
    setLoading(true);
    try {
      const data = await atendimentoService.buscar(page, PAGE_SIZE, applied, {
        field: sortField,
        direction: sortOrder === 1 ? "asc" : "desc",
      });
      setPageData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consulta.");
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, [page, applied, sortField, sortOrder, searched]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = () => {
    setPage(0);
    setApplied(filters);
    setSearched(true);
  };

  const onPage = (e: DataTablePageEvent) => {
    setPage(e.page ?? 0);
  };

  const onSort = (e: DataTableSortEvent) => {
    const field = e.sortField;
    if (typeof field !== "string" || !isAtendimentoSortField(field)) return;
    setSortField(field);
    setSortOrder(e.sortOrder ?? DEFAULT_SORT_ORDER);
    setPage(0);
  };

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const range = pageData ? springPageDisplayRange(pageData) : { from: 0, to: 0 };

  if (!isApiConfigured()) {
    return (
      <div className="mx-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center text-amber-200">
        A API não está configurada.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
          Filtros de busca
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Contrato
            </label>
            <InputText
              value={filters.contrato ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, contrato: e.target.value }))}
              placeholder="Número ou nome do cliente"
              className={FILTER_INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Nome
            </label>
            <InputText
              value={filters.nome ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do contratante"
              className={FILTER_INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              CPF
            </label>
            <InputText
              value={filters.cpf ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, cpf: e.target.value }))}
              placeholder="000.000.000-00"
              className={FILTER_INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Celular
            </label>
            <InputText
              value={filters.celular ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, celular: e.target.value }))}
              placeholder="(00) 00000-0000"
              className={FILTER_INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="atend-emp"
              className="text-[10px] font-bold uppercase tracking-widest text-white/40"
            >
              Empreendimento
            </label>
            <MultiSelect
              inputId="atend-emp"
              value={filters.empreendimentos ?? []}
              options={empreendimentoOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  empreendimentos: nonEmptyArray(e.value as string[] | null),
                  quadras: undefined,
                  lotes: undefined,
                }))
              }
              placeholder="Selecione"
              display="chip"
              disabled={empreendimentosLoading}
              className="w-full"
              pt={MULTISELECT_PT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="atend-quadra"
              className="text-[10px] font-bold uppercase tracking-widest text-white/40"
            >
              Quadra
            </label>
            <MultiSelect
              inputId="atend-quadra"
              value={filters.quadras ?? []}
              options={quadraOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  quadras: nonEmptyArray(e.value as string[] | null),
                  lotes: undefined,
                }))
              }
              placeholder={
                selectedEmpreendimentos.length > 0
                  ? "Selecione"
                  : "Selecione o empreendimento"
              }
              display="chip"
              disabled={selectedEmpreendimentos.length === 0 || quadrasLoading}
              className="w-full"
              pt={MULTISELECT_PT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="atend-lote"
              className="text-[10px] font-bold uppercase tracking-widest text-white/40"
            >
              Lote
            </label>
            <MultiSelect
              inputId="atend-lote"
              value={filters.lotes ?? []}
              options={loteOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  lotes: nonEmptyArray(e.value as number[] | null),
                }))
              }
              placeholder={
                selectedEmpreendimentos.length === 0
                  ? "Selecione o empreendimento"
                  : selectedQuadras.length === 0
                    ? "Selecione a quadra"
                    : "Selecione"
              }
              display="chip"
              disabled={
                selectedEmpreendimentos.length === 0 ||
                selectedQuadras.length === 0 ||
                lotesLoading
              }
              className="w-full"
              pt={MULTISELECT_PT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="atend-situacao"
              className="text-[10px] font-bold uppercase tracking-widest text-white/40"
            >
              Situação
            </label>
            <MultiSelect
              inputId="atend-situacao"
              value={filters.situacoesFinanceiras ?? []}
              options={ATENDIMENTO_SITUACAO_FINANCEIRA_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  situacoesFinanceiras: nonEmptyArray(
                    e.value as AtendimentoStatusFinanceiro[] | null,
                  ),
                }))
              }
              placeholder="Selecione"
              display="chip"
              className="w-full"
              pt={MULTISELECT_PT}
            />
          </div>
        </div>
        <div className="mt-6 flex w-full flex-wrap items-center justify-end gap-3">
          {searched && (
            <span className="mr-auto text-sm text-white/40">
              <span className="font-bold text-white">{totalRecords}</span> contrato(s)
            </span>
          )}
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border-none bg-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-50"
          >
            Buscar
            <Search size={16} aria-hidden />
          </button>
        </div>
      </div>

      {searched && (
        <DashboardDataTableShell>
          <DataTable
            value={rows}
            lazy
            paginator
            first={page * PAGE_SIZE}
            rows={PAGE_SIZE}
            totalRecords={totalRecords}
            onPage={onPage}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            sortMode="single"
            removableSort={false}
            loading={loading}
            emptyMessage="Nenhum contrato encontrado para os filtros informados."
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
          >
            <Column
              field="numeroContrato"
              header="Contrato"
              sortable
              body={(row: AtendimentoBuscaItem) =>
                dashboardCellMono(row.numeroContrato ?? String(row.contratoId))
              }
            />
            <Column
              field="contratanteNome"
              header="Cliente"
              sortable
              body={(row: AtendimentoBuscaItem) => dashboardCellText(row.contratanteNome)}
            />
            <Column
              field="cpf"
              header="CPF"
              sortable
              body={(row: AtendimentoBuscaItem) =>
                dashboardCellMono(formatCpfDisplay(row.cpf))
              }
            />
            <Column
              field="empreendimento"
              header="Imóvel"
              sortable
              body={(row: AtendimentoBuscaItem) => dashboardCellText(imovelLabel(row))}
            />
            <Column
              field="saldoDevedor"
              header="Saldo"
              sortable
              body={(row: AtendimentoBuscaItem) =>
                dashboardCellMono(formatMoney(row.saldoDevedor))
              }
            />
            <Column
              field="percentualQuitacao"
              header="Quitação"
              sortable
              body={(row: AtendimentoBuscaItem) =>
                dashboardCellMono(`${row.percentualQuitacao}%`)
              }
            />
            <Column
              field="statusFinanceiro"
              header="Situação"
              sortable
              body={(row: AtendimentoBuscaItem) =>
                dashboardStatusBadge(row.statusFinanceiro, ATENDIMENTO_STATUS_FINANCEIRO_TONES)
              }
            />
            <Column
              header=""
              body={(row: AtendimentoBuscaItem) => (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border-none bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-blue-600"
                  onClick={() =>
                    router.push(`/dashboard/atendimento/painel?id=${row.contratoId}`)
                  }
                >
                  <Eye size={14} />
                  Painel
                </button>
              )}
              align="right"
            />
          </DataTable>
          {totalRecords > 0 && (
            <div className="border-t border-white/5 px-6 py-3 text-xs text-white/35">
              Exibindo {range.from}–{range.to} de {totalRecords}
            </div>
          )}
        </DashboardDataTableShell>
      )}
    </div>
  );
}
