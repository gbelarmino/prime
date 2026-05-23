"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { CalendarDays, CloudDownload, Clock, Hash, Percent, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { finService, type IndiceEconomicoMensal } from "@/lib/fin-service";
import { isAdmin } from "@/lib/auth-storage";
import { isApiConfigured } from "@/lib/api-config";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";

const PAGE_SIZE = 10;

const FILTER_DROPDOWN_PT = {
  input: {
    className:
      "w-full rounded-full border-white/10 bg-white/5 py-3 pl-4 pr-4 text-sm text-white placeholder:text-white/25",
  },
};

const CLIENTES_TABLE_PT = {
  header: { className: "bg-transparent border-white/5 p-6" },
  table: { className: "bg-transparent" },
  thead: { className: "bg-white/5" },
  headerRow: { className: "bg-transparent" },
  bodyRow: {
    className: "bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors group",
  },
  column: {
    headerCell: {
      className:
        "bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6",
    },
    bodyCell: { className: "border-white/5 py-4 px-6" },
  },
  paginator: {
    root: { className: "bg-transparent border-white/5 p-4" },
    pages: { className: "flex gap-1" },
    pageButton: ({ context }: { context?: { active?: boolean } }) => ({
      className: cn(
        "rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center",
        context?.active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : "bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white",
      ),
    }),
  },
};

/** Alinhado ao backfill manual da API (desde jan/2015). */
const IPCA_SERIE_COMPLETA_DESDE = "2015-01";

const PERIODO_OPCOES = [
  { label: "Últimos 12 meses", value: 12 },
  { label: "Últimos 24 meses", value: 24 },
  { label: "Últimos 36 meses", value: 36 },
  { label: "Últimos 60 meses", value: 60 },
  { label: "Série completa (desde jan/2015)", value: 0 },
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
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (meses <= 0) {
    return { desde: IPCA_SERIE_COMPLETA_DESDE, ate: fmt(ate) };
  }
  const desde = new Date(ate.getFullYear(), ate.getMonth() - (meses - 1), 1);
  return { desde: fmt(desde), ate: fmt(ate) };
}

export function IpcaIndiceList() {
  const [rows, setRows] = useState<IndiceEconomicoMensal[]>([]);
  const [ultimo, setUltimo] = useState<IndiceEconomicoMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [meses, setMeses] = useState<number>(0);
  const hasLoadedRef = useRef(false);
  const admin = isAdmin();

  const rowsOrdenados = useMemo(
    () => [...rows].sort((a, b) => b.anoMes - a.anoMes),
    [rows],
  );

  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
        setRefreshing(false);
        hasLoadedRef.current = true;
      }
    },
    [meses],
  );

  useEffect(() => {
    void load(hasLoadedRef.current);
  }, [load]);

  const sincronizar = async () => {
    setSyncing(true);
    try {
      const result = await finService.sincronizarIndicesIpca();
      if (result.status === "SUCESSO") {
        toast.success(
          `IPCA sincronizado (histórico completo): ${result.registrosNovos} novos, ${result.registrosAtualizados} atualizados.`,
        );
      } else if (result.status === "PARCIAL") {
        toast.warning(
          result.erro ??
            `Sync parcial: ${result.registrosNovos} novos, ${result.registrosAtualizados} atualizados.`,
        );
      } else {
        toast.error(result.erro ?? "Falha ao sincronizar IPCA.");
      }
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível sincronizar com o IBGE.");
    } finally {
      setSyncing(false);
    }
  };

  const referenciaBody = (row: IndiceEconomicoMensal) => {
    const texto = formatMesReferencia(row.ano, row.mes);
    return (
      <div className="flex items-center gap-3">
        <IpcaIconBox>
          <CalendarDays size={18} />
        </IpcaIconBox>
        <div className="flex flex-col">
          <span className="font-semibold leading-tight text-white">{texto}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {String(row.ano).padStart(4, "0")}-{String(row.mes).padStart(2, "0")}
          </span>
        </div>
      </div>
    );
  };

  const percentualBody = (valor: number | null | undefined) => {
    if (valor == null) return <span className="text-white/20">—</span>;
    return (
      <IpcaIconCell icon={<Percent size={14} className="text-blue-400/60" />}>
        <span className="font-mono text-sm tabular-nums tracking-tight text-white/60">
          {formatPercentual(valor)}
        </span>
      </IpcaIconCell>
    );
  };

  const acum12Body = (valor: number | null | undefined) => {
    if (valor == null) return <span className="text-white/20">—</span>;
    return (
      <IpcaIconCell icon={<Percent size={14} className="text-amber-400/60" />}>
        <span className="font-mono text-sm tabular-nums tracking-tight text-amber-300/90">
          {formatPercentual(valor)}
        </span>
      </IpcaIconCell>
    );
  };

  const numeroIndiceBody = (valor: number | null | undefined) => {
    if (valor == null) return <span className="text-white/20">—</span>;
    return (
      <IpcaIconCell icon={<Hash size={14} className="text-blue-400/60" />}>
        <span className="font-mono text-sm tabular-nums tracking-tight text-white/60">
          {formatNumeroIndice(valor)}
        </span>
      </IpcaIconCell>
    );
  };

  const sincronizadoBody = (valor: string | null | undefined) => {
    const texto = formatBusinessDateTimeWithSeconds(valor);
    if (texto === "—") return <span className="text-white/20">—</span>;
    return (
      <IpcaIconCell icon={<Clock size={14} className="text-blue-400/60" />}>
        <span className="font-mono text-sm tabular-nums tracking-tight text-white/60">{texto}</span>
      </IpcaIconCell>
    );
  };

  const header = (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="w-full md:w-72">
          <label
            htmlFor="ipca-periodo"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/35"
          >
            Período
          </label>
          <Dropdown
            inputId="ipca-periodo"
            value={meses}
            options={[...PERIODO_OPCOES]}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => setMeses(e.value === 0 ? 0 : Number(e.value) || 24)}
            className="w-full"
            pt={FILTER_DROPDOWN_PT}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <p className="text-sm text-white/40">
            <span className="font-bold text-white">{rowsOrdenados.length}</span> índices no período
          </p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn("shrink-0", refreshing && "animate-spin")} />
            Atualizar
          </button>
          {admin ? (
            <button
              type="button"
              onClick={() => void sincronizar()}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-200 transition-all hover:bg-blue-600/30 disabled:pointer-events-none disabled:opacity-50"
            >
              <CloudDownload size={14} className={cn("shrink-0", syncing && "animate-pulse")} />
              Sincronizar IBGE
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-white/35">
        Fonte: IBGE SIDRA (tabela 1737). A variação acumulada em 12 meses é a referência contratual
        para reajuste de parcelas. No primeiro arranque da API, a série desde jan/2015 é carregada do
        IBGE; o job mensal atualiza os meses recentes. Use &quot;Sincronizar IBGE&quot; (admin) para forçar
        atualização.
      </p>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
        <p className="text-amber-200">A API não está configurada. Verifique suas variáveis de ambiente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4">
      {ultimo ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <IpcaSummaryCard label="Último mês" value={formatMesReferencia(ultimo.ano, ultimo.mes)} />
          <IpcaSummaryCard label="Variação mensal" value={formatPercentual(ultimo.variacaoMensal)} />
          <IpcaSummaryCard
            label="Acumulado 12 meses"
            value={formatPercentual(ultimo.variacao12Meses)}
            valueClassName="text-amber-300"
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
        <DataTable
          value={rowsOrdenados}
          dataKey="anoMes"
          loading={loading || refreshing}
          paginator
          rows={PAGE_SIZE}
          rowsPerPageOptions={[10, 20, 40]}
          header={header}
          className="p-datatable-responsive-demo"
          emptyMessage="Nenhum índice IPCA sincronizado. Peça a um administrador para sincronizar com o IBGE."
          responsiveLayout="stack"
          breakpoint="960px"
          pt={CLIENTES_TABLE_PT}
        >
          <Column field="anoMes" header="Referência" body={referenciaBody} />
          <Column header="Var. mensal" body={(r: IndiceEconomicoMensal) => percentualBody(r.variacaoMensal)} />
          <Column
            header="Acum. 12 meses"
            body={(r: IndiceEconomicoMensal) => acum12Body(r.variacao12Meses)}
          />
          <Column header="Nº índice" body={(r: IndiceEconomicoMensal) => numeroIndiceBody(r.numeroIndice)} />
          <Column
            header="Sincronizado em"
            body={(r: IndiceEconomicoMensal) => sincronizadoBody(r.sincronizadoEm)}
          />
        </DataTable>
      </div>
    </div>
  );
}

function IpcaIconBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/10 bg-blue-500/10 text-blue-400 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
      {children}
    </div>
  );
}

function IpcaIconCell({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      {icon}
      {children}
    </div>
  );
}

function IpcaSummaryCard({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold", valueClassName)}>{value}</p>
    </div>
  );
}
