"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "sonner";
import { ArrowLeft, BookOpen } from "lucide-react";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { cn } from "@/lib/utils";
import { finService, formatContratoRef, type LancamentoContabil, type LancamentoLinha } from "@/lib/fin-service";

const STATUS_TONES: Record<string, string> = {
  CONFIRMADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  ESTORNADO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  RASCUNHO: "border-white/10 bg-white/10 text-white/50",
};

const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30";
const VALUE_CLASS = "font-medium text-white";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LancamentoDetalhe({ lancamentoId }: { lancamentoId: string }) {
  const [lancamento, setLancamento] = useState<LancamentoContabil | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await finService.getLancamento(lancamentoId);
      setLancamento(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar lançamento.");
      setLancamento(null);
    } finally {
      setLoading(false);
    }
  }, [lancamentoId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="px-4 py-16 text-center text-sm font-medium text-white/30 animate-pulse">
        Carregando lançamento…
      </div>
    );
  }

  if (!lancamento) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Lançamento não encontrado
          </p>
          <Link
            href="/dashboard/financeiro/lancamentos"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/financeiro/lancamentos"
          className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 no-underline transition hover:text-white/70"
        >
          <ArrowLeft size={14} />
          Lançamentos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em] text-blue-400">
              <BookOpen size={14} />
              Lançamento contábil
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white">
              {formatDate(lancamento.competencia)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">{lancamento.historico}</p>
          </div>
          {dashboardStatusBadge(lancamento.status, STATUS_TONES)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white/35">Resumo</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className={LABEL_CLASS}>Competência</dt>
              <dd className={VALUE_CLASS}>{formatDate(lancamento.competencia)}</dd>
            </div>
            <div>
              <dt className={LABEL_CLASS}>Cadastro</dt>
              <dd className={VALUE_CLASS}>{formatDateTime(lancamento.cadastroEm)}</dd>
            </div>
            <div>
              <dt className={LABEL_CLASS}>Contrato</dt>
              <dd className={VALUE_CLASS}>
                {formatContratoRef(lancamento.numeroContrato, lancamento.contratoId)}
              </dd>
            </div>
            <div>
              <dt className={LABEL_CLASS}>Parcela</dt>
              <dd className={VALUE_CLASS}>
                {lancamento.numeroParcela != null ? lancamento.numeroParcela : "—"}
              </dd>
            </div>
            <div>
              <dt className={LABEL_CLASS}>Total débito</dt>
              <dd className={VALUE_CLASS}>{formatMoney(lancamento.totalDebito)}</dd>
            </div>
            <div>
              <dt className={LABEL_CLASS}>Total crédito</dt>
              <dd className={VALUE_CLASS}>{formatMoney(lancamento.totalCredito)}</dd>
            </div>
            {lancamento.tituloId && (
              <div className="sm:col-span-2">
                <dt className={LABEL_CLASS}>Título vinculado</dt>
                <dd>
                  <Link
                    href={`/dashboard/financeiro/titulos/detalhe?id=${lancamento.tituloId}`}
                    className="text-sm font-medium text-blue-400 no-underline hover:text-blue-300"
                  >
                    Ver título
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white/35">
            Partidas dobradas
          </h2>
          <div className={cn(DASHBOARD_DATATABLE_INSET_SHELL_CLASS, "overflow-hidden")}>
            <DataTable
              value={lancamento.linhas}
              emptyMessage="Sem linhas contábeis."
              className={DASHBOARD_DATATABLE_CLASS}
              pt={dashboardDataTablePt({ density: "compact", paginator: false })}
            >
              <Column
                header="Conta"
                body={(row: LancamentoLinha) => dashboardCellMono(row.contaCodigo)}
                style={{ width: "18%" }}
              />
              <Column
                header="Nome"
                body={(row: LancamentoLinha) => dashboardCellText(row.contaNome)}
                style={{ width: "34%" }}
              />
              <Column
                header="Débito"
                body={(row: LancamentoLinha) => dashboardCellText(formatMoney(row.debito))}
                style={{ width: "18%" }}
              />
              <Column
                header="Crédito"
                body={(row: LancamentoLinha) => dashboardCellText(formatMoney(row.credito))}
                style={{ width: "18%" }}
              />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
}
