"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { Calculator, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPercentualIndice,
  periodoIndiceParaSimulacao,
  resolverParcelaLimiteMesAtual,
  resolverPercentualFixoReajuste,
  simularParcelasIndice,
  type IndiceSimulacaoParcela,
  type TipoIndiceSimulacao,
} from "@/lib/fin-indice-simulacao";
import {
  finService,
  formatContratoRef,
  type IndiceEconomicoMensal,
  type TituloCobranca,
  type TituloContextoLote,
} from "@/lib/fin-service";
import { dashboardStatusBadge } from "@/lib/dashboard-datatable";

const FILTER_DROPDOWN_PT = {
  input: {
    className:
      "w-full border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25",
  },
};

const STATUS_TONES: Record<string, string> = {
  RASCUNHO: "border-white/10 bg-white/10 text-white/50",
  AGUARDANDO_REGISTRO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  REGISTRADO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
  EMITIDO: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  PAGO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  VENCIDO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  CANCELADO: "border-white/10 bg-white/10 text-white/40",
  BAIXA_SOLICITADA: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  ERRO_REGISTRO: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

const INDICE_UI: Record<
  TipoIndiceSimulacao,
  { tituloPainel: string; labelIndice: string; erroIndices: string; textoVazio: string }
> = {
  IPCA: {
    tituloPainel: "Simulação IPCA",
    labelIndice: "IPCA",
    erroIndices: "Falha ao carregar índices IPCA para a simulação.",
    textoVazio:
      "Selecione empreendimento, quadra e lote e clique em Pesquisar para comparar títulos emitidos com a simulação IPCA.",
  },
  IGPM: {
    tituloPainel: "Simulação IGP-M",
    labelIndice: "IGP-M",
    erroIndices: "Falha ao carregar índices IGP-M para a simulação.",
    textoVazio:
      "Selecione empreendimento, quadra e lote e clique em Pesquisar para comparar títulos emitidos com a simulação IGP-M.",
  },
};

function listarIndices(
  tipo: TipoIndiceSimulacao,
  periodo: { desde: string; ate: string },
): Promise<IndiceEconomicoMensal[]> {
  return tipo === "IPCA"
    ? finService.listIndicesIpca(periodo)
    : finService.listIndicesIgpm(periodo);
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

async function listarTitulosDoLote(
  empreendimento: string,
  quadra: string,
  lote: number,
): Promise<TituloCobranca[]> {
  const size = 200;
  let page = 0;
  const todos: TituloCobranca[] = [];
  for (;;) {
    const res = await finService.listTitulos(page, size, {
      empreendimento,
      quadra,
      lote,
    });
    todos.push(...(res.content ?? []));
    if (res.number >= res.totalPages - 1 || (res.content?.length ?? 0) < size) break;
    page += 1;
  }
  return todos.sort((a, b) => a.numeroParcela - b.numeroParcela);
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label.trim() ? (
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {label}
        </label>
      ) : null}
      {children}
    </div>
  );
}

function PainelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-white/40">{subtitle}</p> : null}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">{children}</div>
    </div>
  );
}

function ListaTitulosEmitidos({ titulos }: { titulos: TituloCobranca[] }) {
  if (titulos.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-white/35">
        Nenhum título encontrado para este lote.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-[#071c33] text-[10px] font-bold uppercase tracking-widest text-white/40">
        <tr>
          <th className="px-4 py-3">Parc.</th>
          <th className="px-4 py-3">Vencimento</th>
          <th className="px-4 py-3 text-right">Valor</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.06] text-white/70">
        {titulos.map((t) => (
          <tr key={t.id} className="bg-white/[0.02] hover:bg-white/[0.04]">
            <td className="px-4 py-2.5 font-mono">{t.numeroParcela}</td>
            <td className="px-4 py-2.5">{formatDate(t.vencimento)}</td>
            <td className="px-4 py-2.5 text-right">{formatMoney(t.valorNominal)}</td>
            <td className="px-4 py-2.5">
              {dashboardStatusBadge(t.status, STATUS_TONES)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LinhaSimulacao({
  item,
  labelIndice,
}: {
  item: IndiceSimulacaoParcela;
  labelIndice: string;
}) {
  const temDivergencia =
    item.divergencia != null && Math.abs(item.divergencia) >= 0.01;

  return (
    <tr
      className={cn(
        "bg-white/[0.02]",
        item.parcelaReajuste &&
          "bg-violet-500/[0.08] ring-1 ring-inset ring-violet-500/20",
        temDivergencia && !item.parcelaReajuste && "bg-amber-500/[0.06]",
      )}
    >
      <td className="px-4 py-2.5">
        <div className="font-mono">{item.parcela}</div>
        {item.reajusteAplicadoNestaParcela ? (
          <div className="mt-1 text-[10px] leading-tight text-violet-300/90">
            <span className="font-semibold">
              {item.percentualTotalReajuste != null
                ? `Reajuste ${formatPercentualIndice(item.percentualTotalReajuste)}`
                : "Reajuste —"}
            </span>
            <span className="block text-violet-300/75">
              {formatPercentualIndice(item.percentualFixoReajuste)} fixo
              {item.indice12MesesReferencia != null
                ? ` + ${labelIndice} ${formatPercentualIndice(item.indice12MesesReferencia)}`
                : ` + ${labelIndice} —`}
            </span>
            {item.mesReferenciaIndice ? (
              <span className="block text-violet-300/60">ref. {item.mesReferenciaIndice}</span>
            ) : null}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-2.5">{formatDate(item.vencimento)}</td>
      <td className="px-4 py-2.5 text-right font-medium text-emerald-200/90">
        {formatMoney(item.valorSimulado)}
      </td>
      <td className="px-4 py-2.5 text-right text-white/45">
        {item.valorEmitido != null ? formatMoney(item.valorEmitido) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        {temDivergencia ? (
          <span
            className={cn(
              "font-mono text-[11px]",
              item.divergencia! > 0 ? "text-amber-300" : "text-rose-300",
            )}
          >
            {item.divergencia! > 0 ? "+" : ""}
            {formatMoney(item.divergencia)}
          </span>
        ) : (
          <span className="text-white/25">—</span>
        )}
      </td>
    </tr>
  );
}

function ListaSimulacaoIndice({
  simulacao,
  valorBase,
  primeiraVencimento,
  percentualFixoReajuste,
  labelIndice,
}: {
  simulacao: IndiceSimulacaoParcela[];
  valorBase: number;
  primeiraVencimento: string;
  percentualFixoReajuste: number;
  labelIndice: string;
}) {
  if (simulacao.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-white/35">
        Sem dados para simular. Não há parcela com vencimento até o mês atual (é necessário ao menos a
        1ª parcela na grade).
      </p>
    );
  }

  return (
    <>
      <p className="mb-3 px-4 text-[11px] text-white/40">
        Base: {formatMoney(valorBase)} · 1º vencimento {formatDate(primeiraVencimento)} · até o mês
        atual · reajuste anual {formatPercentualIndice(percentualFixoReajuste)} + {labelIndice} 12
        meses (parcelas 13, 25, 37…)
      </p>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-[#071c33] text-[10px] font-bold uppercase tracking-widest text-white/40">
          <tr>
            <th className="px-4 py-3">Parc.</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3 text-right">Simulado</th>
            <th className="px-4 py-3 text-right">Emitido</th>
            <th className="px-4 py-3 text-right">Dif.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06] text-white/70">
          {simulacao.map((item) => (
            <LinhaSimulacao key={item.parcela} item={item} labelIndice={labelIndice} />
          ))}
        </tbody>
      </table>
    </>
  );
}

export function TitulosIndiceSimulacaoWorkspace({
  tipoIndice,
}: {
  tipoIndice: TipoIndiceSimulacao;
}) {
  const ui = INDICE_UI[tipoIndice];

  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(false);
  const [empreendimento, setEmpreendimento] = useState<string | null>(null);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [quadra, setQuadra] = useState<string | null>(null);
  const [lotes, setLotes] = useState<number[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [lote, setLote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [titulos, setTitulos] = useState<TituloCobranca[]>([]);
  const [contexto, setContexto] = useState<TituloContextoLote | null>(null);
  const [pesquisado, setPesquisado] = useState(false);
  const [simulacao, setSimulacao] = useState<IndiceSimulacaoParcela[]>([]);
  const [simulacaoLoading, setSimulacaoLoading] = useState(false);

  useEffect(() => {
    setEmpreendimentosLoading(true);
    void finService
      .listEmpreendimentos()
      .then(setEmpreendimentos)
      .catch(() => toast.error("Falha ao carregar empreendimentos."))
      .finally(() => setEmpreendimentosLoading(false));
  }, []);

  useEffect(() => {
    setQuadra(null);
    setLote(null);
    setQuadras([]);
    setLotes([]);
    if (!empreendimento) return;
    setQuadrasLoading(true);
    void finService
      .listQuadrasImovel({ empreendimento })
      .then(setQuadras)
      .catch(() => toast.error("Falha ao carregar quadras."))
      .finally(() => setQuadrasLoading(false));
  }, [empreendimento]);

  useEffect(() => {
    setLote(null);
    setLotes([]);
    if (!empreendimento || !quadra) return;
    setLotesLoading(true);
    void finService
      .listLotesImovel({ empreendimento, quadra })
      .then(setLotes)
      .catch(() => toast.error("Falha ao carregar lotes."))
      .finally(() => setLotesLoading(false));
  }, [empreendimento, quadra]);

  const pesquisar = useCallback(async () => {
    if (!empreendimento || !quadra || lote == null) {
      toast.error("Selecione empreendimento, quadra e lote.");
      return;
    }
    setLoading(true);
    setPesquisado(false);
    try {
      const [lista, ctx] = await Promise.all([
        listarTitulosDoLote(empreendimento, quadra, lote),
        finService.contextoLote(empreendimento, quadra, lote),
      ]);
      setTitulos(lista);
      setContexto(ctx);
      setPesquisado(true);
    } catch (e) {
      setTitulos([]);
      setContexto(null);
      toast.error(e instanceof Error ? e.message : "Erro ao pesquisar títulos.");
    } finally {
      setLoading(false);
    }
  }, [empreendimento, quadra, lote]);

  const percentualFixoReajuste = useMemo(
    () => resolverPercentualFixoReajuste(contexto?.percentualCorrecao),
    [contexto?.percentualCorrecao],
  );

  const parcelaAtual = useMemo(() => {
    if (!contexto || titulos.length === 0) return 0;
    return resolverParcelaLimiteMesAtual({
      titulos,
      diaVencimentoMensal: contexto.diaVencimentoMensal,
    });
  }, [titulos, contexto]);

  const primeiraParcela = titulos[0] ?? null;

  useEffect(() => {
    if (!pesquisado || !primeiraParcela || !contexto || parcelaAtual < 1) {
      setSimulacao([]);
      return;
    }

    let cancelled = false;
    setSimulacaoLoading(true);
    const periodo = periodoIndiceParaSimulacao(
      primeiraParcela.vencimento,
      parcelaAtual,
      tipoIndice,
    );

    void listarIndices(tipoIndice, periodo)
      .then((indices) => {
        if (cancelled) return;
        setSimulacao(
          simularParcelasIndice({
            titulos,
            diaVencimentoMensal: contexto.diaVencimentoMensal,
            parcelaAtual,
            indices,
            percentualCorrecao: contexto.percentualCorrecao,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(ui.erroIndices);
          setSimulacao([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSimulacaoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    pesquisado,
    titulos,
    contexto,
    parcelaAtual,
    primeiraParcela,
    tipoIndice,
    ui.erroIndices,
  ]);

  const empreendimentoOptions = useMemo(
    () => empreendimentos.map((e) => ({ label: e, value: e })),
    [empreendimentos],
  );
  const quadraOptions = useMemo(
    () => quadras.map((q) => ({ label: q, value: q })),
    [quadras],
  );
  const loteOptions = useMemo(
    () => lotes.map((l) => ({ label: String(l), value: l })),
    [lotes],
  );

  const subtituloLote = `${empreendimento} · Q${quadra} L${lote}${
    contexto
      ? ` · Contrato ${formatContratoRef(contexto.numeroContrato, contexto.contratoId)}`
      : ""
  }`;

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <FilterField label="Empreendimento">
            <Dropdown
              value={empreendimento}
              options={empreendimentoOptions}
              onChange={(e) => setEmpreendimento((e.value as string) ?? null)}
              placeholder="Selecione"
              className="w-full"
              pt={FILTER_DROPDOWN_PT}
              disabled={empreendimentosLoading}
            />
          </FilterField>
          <FilterField label="Quadra">
            <Dropdown
              value={quadra}
              options={quadraOptions}
              onChange={(e) => setQuadra((e.value as string) ?? null)}
              placeholder="Selecione"
              className="w-full"
              pt={FILTER_DROPDOWN_PT}
              disabled={!empreendimento || quadrasLoading}
            />
          </FilterField>
          <FilterField label="Lote">
            <Dropdown
              value={lote}
              options={loteOptions}
              onChange={(e) => setLote((e.value as number) ?? null)}
              placeholder="Selecione"
              className="w-full"
              pt={FILTER_DROPDOWN_PT}
              disabled={!quadra || lotesLoading}
            />
          </FilterField>
          <FilterField label=" ">
            <button
              type="button"
              onClick={() => void pesquisar()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Pesquisar
            </button>
          </FilterField>
        </div>
      </div>

      {pesquisado ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <PainelCard
            title="Títulos emitidos"
            subtitle={`${subtituloLote} · ${titulos.length} título(s)`}
          >
            <ListaTitulosEmitidos titulos={titulos} />
          </PainelCard>

          <PainelCard
            title={ui.tituloPainel}
            subtitle={
              parcelaAtual > 0
                ? `${subtituloLote} · parcelas 1–${parcelaAtual} (até o mês atual) · próxima ${contexto?.numeroParcela ?? "—"}`
                : `${subtituloLote} · nenhuma parcela vencida até o mês atual`
            }
          >
            {simulacaoLoading ? (
              <p className="px-6 py-12 text-center text-sm text-white/30 animate-pulse">
                Calculando simulação…
              </p>
            ) : (
              <ListaSimulacaoIndice
                simulacao={simulacao}
                valorBase={primeiraParcela?.valorNominal ?? 0}
                primeiraVencimento={primeiraParcela?.vencimento ?? ""}
                percentualFixoReajuste={percentualFixoReajuste}
                labelIndice={ui.labelIndice}
              />
            )}
          </PainelCard>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
          <Calculator className="text-white/20" size={40} />
          <p className="text-sm text-white/40">{ui.textoVazio}</p>
        </div>
      )}
    </div>
  );
}
