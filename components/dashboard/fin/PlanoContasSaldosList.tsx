"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  DASHBOARD_SEARCH_ICON_COMPACT_CLASS,
  DASHBOARD_SEARCH_INPUT_COMPACT_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { finService, type PlanoContaNatureza, type PlanoContaSaldo } from "@/lib/fin-service";

const NATUREZA_TONES: Record<string, string> = {
  ATIVO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  PASSIVO: "border-violet-500/25 bg-violet-500/15 text-violet-300",
  RECEITA: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  DESPESA: "border-amber-500/25 bg-amber-500/15 text-amber-300",
};

const NATUREZA_ORDEM: PlanoContaNatureza[] = ["ATIVO", "PASSIVO", "RECEITA", "DESPESA"];

const NATUREZA_SECOES: Record<
  PlanoContaNatureza,
  { titulo: string; hint: string }
> = {
  ATIVO: {
    titulo: "Ativo",
    hint: "Saldo = débitos − créditos (ex.: banco, contas a receber).",
  },
  PASSIVO: {
    titulo: "Passivo",
    hint: "Saldo = créditos − débitos (obrigações e dívidas).",
  },
  RECEITA: {
    titulo: "Receita",
    hint: "Saldo = créditos − débitos (reconhecimento de receitas).",
  },
  DESPESA: {
    titulo: "Despesa",
    hint: "Saldo = débitos − créditos (custos e despesas).",
  },
};

const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

const FILTER_INPUT_CLASS =
  "bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px] [color-scheme:dark]";

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeNatureza(n: string): string {
  return (n ?? "").trim().toUpperCase();
}

type GrupoNatureza = {
  natureza: string;
  titulo: string;
  hint: string;
  contas: PlanoContaSaldo[];
  totalDebito: number;
  totalCredito: number;
  totalSaldo: number;
};

function PlanoContaSaldoTable({
  contas,
  loading,
}: {
  contas: PlanoContaSaldo[];
  loading: boolean;
}) {
  const moneyBody = (field: keyof PlanoContaSaldo) => (row: PlanoContaSaldo) =>
    dashboardCellMono(formatMoney(row[field] as number));

  const saldoBody = (row: PlanoContaSaldo) => {
    const v = row.saldo ?? 0;
    const negative = v < 0;
    return (
      <span
        className={cn(
          "block whitespace-nowrap font-mono text-[12px] tabular-nums tracking-tight",
          negative ? "text-rose-300" : "text-emerald-300",
        )}
      >
        {formatMoney(v)}
      </span>
    );
  };

  return (
    <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
      <DataTable
        value={contas}
        dataKey="id"
        loading={loading}
        emptyMessage="Nenhuma conta nesta natureza."
        responsiveLayout="stack"
        breakpoint="960px"
        className={DASHBOARD_DATATABLE_CLASS}
        pt={TABLE_PT}
        rowHover
      >
        <Column
          header="Código"
          body={(row: PlanoContaSaldo) => dashboardCellMono(row.codigo)}
          style={{ width: "12%" }}
        />
        <Column header="Conta" body={(row: PlanoContaSaldo) => dashboardCellText(row.nome)} />
        <Column header="Débitos" body={moneyBody("totalDebito")} style={{ width: "13%" }} />
        <Column header="Créditos" body={moneyBody("totalCredito")} style={{ width: "13%" }} />
        <Column header="Saldo" body={saldoBody} style={{ width: "13%" }} />
        <Column
          header="Lanç."
          body={(row: PlanoContaSaldo) =>
            dashboardCellMono(String(row.quantidadeLancamentos ?? 0))
          }
          style={{ width: "7%" }}
        />
      </DataTable>
    </div>
  );
}

export function PlanoContasSaldosList() {
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [rows, setRows] = useState<PlanoContaSaldo[]>([]);
  const [busca, setBusca] = useState("");
  const [competenciaDe, setCompetenciaDe] = useState("");
  const [competenciaAte, setCompetenciaAte] = useState("");
  const [apenasComMovimento, setApenasComMovimento] = useState(true);

  const load = useCallback(async (background = false) => {
    const skipLoading = background || hasLoadedRef.current;
    if (skipLoading) {
      setRefreshing(true);
    }
    try {
      const data = await finService.listPlanoContaSaldos(
        {
          competenciaDe: competenciaDe || undefined,
          competenciaAte: competenciaAte || undefined,
          q: busca.trim() || undefined,
          apenasComMovimento,
        },
        { skipLoading },
      );
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar saldos.");
      setRows([]);
    } finally {
      if (skipLoading) {
        setRefreshing(false);
      }
      hasLoadedRef.current = true;
      setHasLoaded(true);
    }
  }, [busca, competenciaDe, competenciaAte, apenasComMovimento]);

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  const grupos = useMemo(() => {
    const porNatureza = new Map<string, PlanoContaSaldo[]>();
    const outras: PlanoContaSaldo[] = [];

    for (const row of rows) {
      const key = normalizeNatureza(row.natureza);
      if (NATUREZA_ORDEM.includes(key as PlanoContaNatureza)) {
        const list = porNatureza.get(key) ?? [];
        list.push(row);
        porNatureza.set(key, list);
      } else {
        outras.push(row);
      }
    }

    const buildGrupo = (natureza: string, contas: PlanoContaSaldo[]): GrupoNatureza => {
      const meta = NATUREZA_SECOES[natureza as PlanoContaNatureza];
      let totalDebito = 0;
      let totalCredito = 0;
      let totalSaldo = 0;
      for (const c of contas) {
        totalDebito += c.totalDebito ?? 0;
        totalCredito += c.totalCredito ?? 0;
        totalSaldo += c.saldo ?? 0;
      }
      return {
        natureza,
        titulo: meta?.titulo ?? natureza,
        hint: meta?.hint ?? "",
        contas: [...contas].sort((a, b) => a.codigo.localeCompare(b.codigo)),
        totalDebito,
        totalCredito,
        totalSaldo,
      };
    };

    const ordered: GrupoNatureza[] = NATUREZA_ORDEM.map((n) => {
      const contas = porNatureza.get(n) ?? [];
      return contas.length > 0 ? buildGrupo(n, contas) : null;
    }).filter((g): g is GrupoNatureza => g != null);

    if (outras.length > 0) {
      ordered.push({
        natureza: "OUTRAS",
        titulo: "Outras naturezas",
        hint: "",
        contas: [...outras].sort((a, b) => a.codigo.localeCompare(b.codigo)),
        totalDebito: outras.reduce((s, c) => s + (c.totalDebito ?? 0), 0),
        totalCredito: outras.reduce((s, c) => s + (c.totalCredito ?? 0), 0),
        totalSaldo: outras.reduce((s, c) => s + (c.saldo ?? 0), 0),
      });
    }

    return ordered;
  }, [rows]);

  const totais = useMemo(() => {
    let debito = 0;
    let credito = 0;
    let lancamentos = 0;
    for (const r of rows) {
      debito += r.totalDebito ?? 0;
      credito += r.totalCredito ?? 0;
      lancamentos += r.quantidadeLancamentos ?? 0;
    }
    return { debito, credito, lancamentos, contas: rows.length };
  }, [rows]);

  return (
    <div className="flex flex-col gap-5 px-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Contas listadas", value: String(totais.contas) },
          { label: "Total débitos", value: formatMoney(totais.debito) },
          { label: "Total créditos", value: formatMoney(totais.credito) },
          { label: "Lançamentos (distintos)", value: String(totais.lancamentos) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{card.label}</p>
            <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/40">
            <span className="font-bold text-white">{totais.contas}</span> contas em{" "}
            <span className="font-bold text-white">{grupos.length}</span> naturezas
          </p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50 md:self-auto"
          >
            <RefreshCw size={14} className={cn("shrink-0", refreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="pc-busca"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Conta
            </label>
            <div className="relative w-full">
              <Search
                className={DASHBOARD_SEARCH_ICON_COMPACT_CLASS}
                size={16}
              />
              <InputText
                id="pc-busca"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Código ou nome…"
                className={DASHBOARD_SEARCH_INPUT_COMPACT_CLASS}
                pt={{ root: { className: "w-full" } }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pc-de"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Competência de
            </label>
            <input
              id="pc-de"
              type="date"
              value={competenciaDe}
              onChange={(e) => setCompetenciaDe(e.target.value)}
              className={FILTER_INPUT_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pc-ate"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35"
            >
              Competência até
            </label>
            <input
              id="pc-ate"
              type="date"
              value={competenciaAte}
              onChange={(e) => setCompetenciaAte(e.target.value)}
              className={FILTER_INPUT_CLASS}
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              inputId="pc-movimento"
              checked={apenasComMovimento}
              onChange={(e) => setApenasComMovimento(!!e.checked)}
            />
            <label htmlFor="pc-movimento" className="cursor-pointer text-xs text-white/60">
              Só com movimento
            </label>
          </div>
        </div>
      </div>

      {!hasLoaded ? null : grupos.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-white/40">
          Nenhuma conta encontrada com os filtros atuais.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <section
              key={grupo.natureza}
              className="flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        NATUREZA_TONES[grupo.natureza] ??
                          "border-white/10 bg-white/10 text-white/50",
                      )}
                    >
                      {grupo.titulo}
                    </span>
                    <span className="text-xs text-white/40">
                      {grupo.contas.length} {grupo.contas.length === 1 ? "conta" : "contas"}
                    </span>
                  </div>
                  {grupo.hint ? (
                    <p className="max-w-2xl text-xs leading-relaxed text-white/45">{grupo.hint}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4 text-right md:justify-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Σ débitos
                    </p>
                    <p className="mt-0.5 font-mono text-sm tabular-nums text-white/80">
                      {formatMoney(grupo.totalDebito)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Σ créditos
                    </p>
                    <p className="mt-0.5 font-mono text-sm tabular-nums text-white/80">
                      {formatMoney(grupo.totalCredito)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Σ saldo
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono text-sm font-semibold tabular-nums",
                        grupo.totalSaldo < 0 ? "text-rose-300" : "text-emerald-300",
                      )}
                    >
                      {formatMoney(grupo.totalSaldo)}
                    </p>
                  </div>
                </div>
              </div>

              <PlanoContaSaldoTable contas={grupo.contas} loading={refreshing} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}