"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { toast } from "sonner";
import {
  DASHBOARD_FORM_INPUT_CLASS,
  DashboardCalendar,
} from "@/lib/dashboard-calendar";
import {
  finService,
  type CobrancaGrupo,
  type CobrancaGrupoEmitirMembro,
  type CobrancaGrupoEmitirPayload,
  type CobrancaGrupoEmitirSimulacao,
  type CobrancaGrupoSugestao,
  type ConvenioBanco,
  type EmpreendimentoConvenioItem,
  type TituloContextoLote,
  type TituloLegadoManualStatus,
} from "@/lib/fin-service";
import {
  buildResumoCalculoIndice,
  resumirAvisoIndiceLinha,
  type ResumoCalculoIndice,
} from "@/lib/fin-calculo-indice-aviso";
import { buildPreviewLote, resolveMaxParcelasLote } from "@/lib/fin-lote-preview";
import { CobrancaGrupoLotePreviewDialog } from "@/components/dashboard/fin/CobrancaGrupoLotePreviewDialog";
import { CobrancaGrupoCalculoDetalheDialog } from "@/components/dashboard/fin/CobrancaGrupoCalculoDetalheDialog";
import { convenioEmpreendimentoDropdownOptions } from "@/lib/convenio-label";
import {
  inicioDoDiaHoje,
  isVencimentoFuturo,
  normalizarDataCalendario,
  parseIsoDate,
} from "@/lib/fin-vencimento";

const CARD_CLASS =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm";
const SUBCARD_CLASS = "rounded-xl border border-white/8 bg-black/25 p-4";
const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS = DASHBOARD_FORM_INPUT_CLASS;
const DROPDOWN_PT = { input: { className: FORM_INPUT_CLASS } };
const BTN_PRIMARY =
  "rounded-xl bg-blue-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40";
const BTN_SECONDARY =
  "rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-40";
const TAB_ACTIVE =
  "border-blue-400/50 bg-blue-500/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const TAB_IDLE =
  "border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/70";

type AcaoGrupo = "emitir" | "lote" | "legado";

const ACOES_GRUPO: { id: AcaoGrupo; label: string; desc: string }[] = [
  { id: "emitir", label: "Emitir boleto", desc: "Simular e registrar boleto consolidado" },
  { id: "lote", label: "Rascunhos em lote", desc: "Várias parcelas em rascunho (botão NOVO)" },
  { id: "legado", label: "Legado manual", desc: "Importar parcelas históricas" },
];

function FormField({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className={FORM_LABEL_CLASS}>{label}</label>
      {children}
      {hint ? <p className="text-xs text-white/35 leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function vencimentoSugeridoFromContexto(ctx: {
  vencimentoSugerido: string;
  primeiroTituloLote: boolean;
  dataPrimeiraParcelaContrato: string;
}): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let venc = parseIsoDate(ctx.vencimentoSugerido);
  if (
    ctx.primeiroTituloLote &&
    ctx.dataPrimeiraParcelaContrato &&
    parseIsoDate(ctx.dataPrimeiraParcelaContrato).getTime() >= hoje.getTime()
  ) {
    venc = parseIsoDate(ctx.dataPrimeiraParcelaContrato);
  }
  if (!isVencimentoFuturo(venc)) {
    venc = inicioDoDiaHoje();
  }
  return normalizarDataCalendario(venc) ?? venc;
}

function loteLabel(quadra?: string | null, lote?: number | null): string {
  if (!quadra && lote == null) return "—";
  return `Q${quadra ?? "?"} L${lote ?? "?"}`;
}

type ValorPorMembro = Record<number, number | null>;

const STATUS_LEGADO_OPTIONS: { label: string; value: TituloLegadoManualStatus }[] = [
  { label: "Emitido", value: "EMITIDO" },
  { label: "Registrado", value: "REGISTRADO" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

function buildMembrosPayload(
  grupo: CobrancaGrupo,
  valores: ValorPorMembro,
  exigirValores: boolean,
): CobrancaGrupoEmitirMembro[] | null {
  if (
    exigirValores &&
    grupo.membros.some((m) => {
      const v = valores[m.contratoId];
      return v == null || v < 0.01;
    })
  ) {
    return null;
  }
  return grupo.membros.map((m) => {
    const v = valores[m.contratoId];
    if (v != null && v >= 0.01) {
      return { contratoId: m.contratoId, valorNominal: v };
    }
    return { contratoId: m.contratoId };
  });
}

function AvisoCalculoIndiceBanner({ resumo }: { resumo: ResumoCalculoIndice }) {
  if (!resumo.tituloBanner) return null;
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 mb-4 space-y-2">
      <p className="text-sm font-medium text-amber-100/95">{resumo.tituloBanner}</p>
      {resumo.detalheBanner ? (
        <p className="text-xs text-amber-200/75 leading-relaxed">{resumo.detalheBanner}</p>
      ) : null}
      <p className="text-xs text-amber-200/65 leading-relaxed">{resumo.dicaAcao}</p>
      {resumo.linkIndices ? (
        <p className="text-xs">
          <Link
            href={resumo.linkIndices}
            className="text-amber-100/90 underline underline-offset-2 hover:text-white"
          >
            Abrir série {resumo.tipoIndice} no Financeiro
          </Link>
          {resumo.indicesFuturosPendentes ? (
            <span className="text-amber-200/55"> — sincronizar só ajuda quando o mês já foi publicado.</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function SugestoesLista({
  sugestoes,
  liderPorSugestao,
  setLiderPorSugestao,
  criandoId,
  criarGrupo,
}: {
  sugestoes: CobrancaGrupoSugestao[];
  liderPorSugestao: Record<string, number>;
  setLiderPorSugestao: Dispatch<SetStateAction<Record<string, number>>>;
  criandoId: string | null;
  criarGrupo: (s: CobrancaGrupoSugestao) => Promise<void>;
}) {
  if (sugestoes.length === 0) {
    return <p className="text-sm text-white/35">Nenhuma sugestão pendente.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {sugestoes.map((s) => {
        const chave = s.numeroContratoBase;
        const liderAtual = liderPorSugestao[chave] ?? s.contratos[0]?.contratoId;
        return (
          <div
            key={chave}
            className="rounded-xl border border-white/8 bg-black/20 p-4 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-white font-medium">{s.numeroContratoBase}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {s.contratanteNome} · {s.empreendimento}
                </p>
              </div>
              <button
                type="button"
                className={BTN_PRIMARY}
                disabled={criandoId === chave}
                onClick={() => void criarGrupo(s)}
              >
                {criandoId === chave ? "Criando…" : "Criar grupo"}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.contratos.map((c) => (
                <label
                  key={c.contratoId}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    liderAtual === c.contratoId
                      ? "border-blue-400/50 bg-blue-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name={`lider-${chave}`}
                    checked={liderAtual === c.contratoId}
                    onChange={() =>
                      setLiderPorSugestao((prev) => ({
                        ...prev,
                        [chave]: c.contratoId,
                      }))
                    }
                    className="accent-blue-400"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-mono truncate">{c.numeroContrato}</p>
                    <p className="text-xs text-white/40">
                      {loteLabel(c.quadra, c.lote)} · próx. parc. {c.proximaParcela}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CobrancaGruposWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<CobrancaGrupo[]>([]);
  const [sugestoes, setSugestoes] = useState<CobrancaGrupoSugestao[]>([]);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [empreendimentoConvenios, setEmpreendimentoConvenios] = useState<
    EmpreendimentoConvenioItem[]
  >([]);

  const [criandoId, setCriandoId] = useState<string | null>(null);
  const [liderPorSugestao, setLiderPorSugestao] = useState<Record<string, number>>({});

  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null);
  const [parcelaLider, setParcelaLider] = useState<number | null>(null);
  const [valoresMembro, setValoresMembro] = useState<ValorPorMembro>({});
  const [convenioId, setConvenioId] = useState<string | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [simulacao, setSimulacao] = useState<CobrancaGrupoEmitirSimulacao | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [carregandoContextoEmissao, setCarregandoContextoEmissao] = useState(false);
  const [contextoLider, setContextoLider] = useState<TituloContextoLote | null>(null);

  const [quantidadeLote, setQuantidadeLote] = useState<number | null>(1);
  const [dataPrimeiraLote, setDataPrimeiraLote] = useState<Date | null>(null);
  const [criandoLote, setCriandoLote] = useState(false);
  const [previewLoteModalOpen, setPreviewLoteModalOpen] = useState(false);
  const [calculoDetalheModalOpen, setCalculoDetalheModalOpen] = useState(false);

  const [vencimentoLegado, setVencimentoLegado] = useState<Date | null>(null);
  const [statusLegado, setStatusLegado] = useState<TituloLegadoManualStatus>("PAGO");
  const [valorPagoLegado, setValorPagoLegado] = useState<number | null>(null);
  const [dataPagamentoLegado, setDataPagamentoLegado] = useState<Date | null>(null);
  const [observacaoLegado, setObservacaoLegado] = useState("");
  const [salvandoLegado, setSalvandoLegado] = useState(false);
  const [acaoGrupo, setAcaoGrupo] = useState<AcaoGrupo>("emitir");

  const grupoSelecionado = useMemo(
    () => grupos.find((g) => g.id === grupoSelecionadoId) ?? null,
    [grupos, grupoSelecionadoId],
  );

  const convenioOptions = useMemo(
    () => convenioEmpreendimentoDropdownOptions(convenios),
    [convenios],
  );

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [gruposRes, sugestoesRes, conveniosRes, vinculosRes] = await Promise.allSettled([
        finService.listCobrancaGrupos({ skipLoading: true }),
        finService.listCobrancaGruposSugestoes({ skipLoading: true }),
        finService.listConvenios(),
        finService.listEmpreendimentoConvenios(),
      ]);
      if (gruposRes.status === "rejected" || sugestoesRes.status === "rejected") {
        const err =
          gruposRes.status === "rejected"
            ? gruposRes.reason
            : sugestoesRes.status === "rejected"
              ? sugestoesRes.reason
              : undefined;
        throw err;
      }
      setGrupos(gruposRes.value);
      setSugestoes(sugestoesRes.value.filter((x) => !x.jaPossuiGrupoAtivo));
      if (conveniosRes.status === "fulfilled") {
        setConvenios(conveniosRes.value);
      }
      if (vinculosRes.status === "fulfilled") {
        setEmpreendimentoConvenios(vinculosRes.value);
      }
      if (conveniosRes.status === "rejected" || vinculosRes.status === "rejected") {
        toast.warning("Grupos carregados, mas convênios por empreendimento não puderam ser listados.");
      }
    } catch {
      toast.error("Falha ao carregar grupos de cobrança.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  useEffect(() => {
    if (!grupoSelecionado) {
      setParcelaLider(null);
      setValoresMembro({});
      setSimulacao(null);
      setVencimento(null);
      setContextoLider(null);
      return;
    }
    const lider = grupoSelecionado.membros.find(
      (m) => m.contratoId === grupoSelecionado.contratoLiderId,
    );
    setParcelaLider(lider?.proximaParcela ?? 1);
    setValoresMembro({});
    setSimulacao(null);
    const vinculo = empreendimentoConvenios.find(
      (v) =>
        v.nomeEmpreendimento.toLowerCase() === grupoSelecionado.empreendimento.toLowerCase(),
    );
    setConvenioId(vinculo?.convenioId ?? null);
    setDataPrimeiraLote(null);
    setVencimentoLegado(null);
    setValorPagoLegado(null);
    setDataPagamentoLegado(null);
    setObservacaoLegado("");
    setAcaoGrupo("emitir");
    setContextoLider(null);

    if (lider?.quadra && lider.lote != null) {
      setCarregandoContextoEmissao(true);
      void finService
        .contextoLote(grupoSelecionado.empreendimento, lider.quadra, lider.lote)
        .then((ctx) => {
          setContextoLider(ctx);
          setVencimento(vencimentoSugeridoFromContexto(ctx));
          if (ctx.convenioId) {
            setConvenioId(ctx.convenioId);
          }
          setParcelaLider(ctx.numeroParcela ?? lider.proximaParcela ?? 1);
        })
        .catch(() => {
          setVencimento(null);
          setContextoLider(null);
        })
        .finally(() => setCarregandoContextoEmissao(false));
    } else {
      setVencimento(null);
    }
  }, [grupoSelecionado, empreendimentoConvenios]);

  const payloadCalculo = useMemo((): CobrancaGrupoEmitirPayload | null => {
    if (!grupoSelecionado || !convenioId || parcelaLider == null || parcelaLider < 1) {
      return null;
    }
    const venc =
      vencimento && isVencimentoFuturo(vencimento) ? vencimento : inicioDoDiaHoje();
    return {
      convenioId,
      vencimento: formatDateIso(venc),
      numeroParcela: parcelaLider,
      membros: grupoSelecionado.membros.map((m) => ({ contratoId: m.contratoId })),
    };
  }, [grupoSelecionado, convenioId, parcelaLider, vencimento]);

  const payloadEmissao = useMemo((): CobrancaGrupoEmitirPayload | null => {
    if (!grupoSelecionado || !convenioId || !vencimento || parcelaLider == null || parcelaLider < 1) {
      return null;
    }
    const membros = grupoSelecionado.membros.map((m) => {
      const base = { contratoId: m.contratoId };
      const valor = valoresMembro[m.contratoId];
      if (valor != null && valor >= 0.01) {
        return { ...base, valorNominal: valor };
      }
      return base;
    });
    return {
      convenioId,
      vencimento: formatDateIso(vencimento),
      numeroParcela: parcelaLider,
      membros,
    };
  }, [grupoSelecionado, convenioId, vencimento, parcelaLider, valoresMembro]);

  const avisoPorMembro = useMemo(() => {
    const map: Record<number, string | null> = {};
    if (simulacao) {
      for (const item of simulacao.itens) {
        if (item.aviso) map[item.contratoId] = item.aviso;
      }
    }
    return map;
  }, [simulacao]);

  const avisoCalculoBackend = useMemo(() => {
    if (simulacao) {
      return simulacao.itens.find((i) => i.aviso)?.aviso ?? null;
    }
    return contextoLider?.avisoValorNominal ?? null;
  }, [simulacao, contextoLider]);

  const resumoCalculoIndice = useMemo(() => {
    if (!contextoLider || parcelaLider == null) return null;
    return buildResumoCalculoIndice({
      parcela: parcelaLider,
      dataPrimeiraParcela: parseIsoDate(contextoLider.dataPrimeiraParcelaContrato),
      diaVencimento: contextoLider.diaVencimentoMensal,
      quantidadeParcelasFracionadas: contextoLider.quantidadeParcelasFracionadas ?? null,
      tipoCorrecaoAnual: contextoLider.tipoCorrecaoAnual ?? null,
      vencimentoEmissao: vencimento,
      avisoBackend: avisoCalculoBackend,
    });
  }, [contextoLider, parcelaLider, vencimento, avisoCalculoBackend]);

  const valorTotalConsolidado = useMemo(() => {
    if (!grupoSelecionado) return null;
    let total = 0;
    for (const m of grupoSelecionado.membros) {
      const v = valoresMembro[m.contratoId];
      if (v == null || !Number.isFinite(v)) return null;
      total += v;
    }
    return total;
  }, [grupoSelecionado, valoresMembro]);

  const podeCalcular = payloadCalculo != null && !carregandoContextoEmissao;

  const motivoCalcularBloqueado = useMemo(() => {
    if (!grupoSelecionado) return null;
    if (carregandoContextoEmissao) return "A carregar convênio e vencimento…";
    if (!convenioId) return "Convênio não configurado para o empreendimento.";
    if (parcelaLider == null || parcelaLider < 1) return "Informe a parcela do líder.";
    return null;
  }, [grupoSelecionado, carregandoContextoEmissao, convenioId, parcelaLider]);

  const podeSimular =
    payloadEmissao != null && vencimento != null && isVencimentoFuturo(vencimento);

  const motivoSimularBloqueado = useMemo(() => {
    if (!grupoSelecionado) return null;
    if (carregandoContextoEmissao) return "A carregar vencimento sugerido…";
    if (!convenioId) return "Selecione o convênio.";
    if (!vencimento) return "Informe o vencimento (ou aguarde a sugestão automática).";
    if (!isVencimentoFuturo(vencimento)) {
      return "O vencimento deve ser hoje ou uma data futura.";
    }
    if (parcelaLider == null || parcelaLider < 1) return "Informe a parcela do líder.";
    return null;
  }, [
    grupoSelecionado,
    carregandoContextoEmissao,
    convenioId,
    vencimento,
    parcelaLider,
  ]);

  const podeEmitir =
    podeSimular &&
    grupoSelecionado != null &&
    grupoSelecionado.membros.every((m) => {
      const v = valoresMembro[m.contratoId];
      return v != null && v >= 0.01;
    });

  const totalLegadoConsolidado = valorTotalConsolidado;

  const podeSalvarLegado =
    grupoSelecionado != null &&
    parcelaLider != null &&
    parcelaLider >= 1 &&
    vencimentoLegado != null &&
    buildMembrosPayload(grupoSelecionado, valoresMembro, true) != null &&
    (statusLegado !== "PAGO" ||
      (valorPagoLegado != null &&
        valorPagoLegado > 0 &&
        dataPagamentoLegado != null));

  const maxParcelasLote = useMemo(() => {
    if (!contextoLider) return 12;
    return Math.min(
      12,
      resolveMaxParcelasLote(
        contextoLider.numeroParcela,
        contextoLider.maxParcelasPermitidas,
      ),
    );
  }, [contextoLider]);

  const previewLoteGrupo = useMemo(() => {
    if (!contextoLider || quantidadeLote == null || quantidadeLote < 1) return null;
    return buildPreviewLote({
      parcelaInicial: contextoLider.numeroParcela,
      diaVencimentoMensal: contextoLider.diaVencimentoMensal,
      referenciaVencimento: contextoLider.referenciaVencimento,
      quantidadeParcelas: quantidadeLote,
      dataPrimeiraParcela: dataPrimeiraLote,
      maxParcelasPermitidas: contextoLider.maxParcelasPermitidas,
      parcelaReajusteLimite: contextoLider.parcelaReajusteLimite,
    });
  }, [contextoLider, quantidadeLote, dataPrimeiraLote]);

  useEffect(() => {
    if (quantidadeLote != null && quantidadeLote > maxParcelasLote) {
      setQuantidadeLote(maxParcelasLote);
    }
  }, [maxParcelasLote, quantidadeLote]);

  const convenioNomeSelecionado = useMemo(() => {
    if (contextoLider?.convenioNome && contextoLider.convenioId === convenioId) {
      return contextoLider.convenioNome;
    }
    return convenios.find((c) => c.id === convenioId)?.nome ?? null;
  }, [convenios, convenioId, contextoLider]);

  const podeCriarLote =
    grupoSelecionado != null &&
    convenioId != null &&
    contextoLider != null &&
    quantidadeLote != null &&
    quantidadeLote >= 1 &&
    quantidadeLote <= maxParcelasLote &&
    previewLoteGrupo != null &&
    previewLoteGrupo.quantidade >= 1;

  const podePrevisualizarLote = podeCriarLote && previewLoteGrupo != null;

  async function criarGrupo(sugestao: CobrancaGrupoSugestao) {
    const chave = sugestao.numeroContratoBase;
    const lider =
      liderPorSugestao[chave] ?? sugestao.contratos[0]?.contratoId;
    if (!lider) return;
    setCriandoId(chave);
    try {
      const grupo = await finService.criarCobrancaGrupo({
        numeroContratoBase: sugestao.numeroContratoBase,
        contratoLiderId: lider,
        contratoIds: sugestao.contratos.map((c) => c.contratoId),
      });
      toast.success(`Grupo ${grupo.numeroContratoBase} criado.`);
      await recarregar();
      setGrupoSelecionadoId(grupo.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar grupo.");
    } finally {
      setCriandoId(null);
    }
  }

  async function calcularValores() {
    if (!grupoSelecionado || !payloadCalculo) return;
    setSimulando(true);
    try {
      const res = await finService.simularEmissaoCobrancaGrupo(
        grupoSelecionado.id,
        payloadCalculo,
      );
      setSimulacao(res);
      const nextValores: ValorPorMembro = {};
      for (const item of res.itens) {
        nextValores[item.contratoId] = item.valorNominal;
      }
      setValoresMembro(nextValores);
      if (!res.prontoParaEmitir) {
        toast.warning(
          "Algumas parcelas não puderam ser calculadas automaticamente. Informe o valor manualmente ou sincronize os índices em Financeiro → IGP-M.",
        );
      } else {
        toast.success("Valores calculados para todos os lotes.");
      }
      setCalculoDetalheModalOpen(true);
    } catch (e) {
      setSimulacao(null);
      toast.error(e instanceof Error ? e.message : "Falha ao calcular valores.");
    } finally {
      setSimulando(false);
    }
  }

  async function simular() {
    if (!grupoSelecionado || !payloadEmissao) return;
    setSimulando(true);
    try {
      const res = await finService.simularEmissaoCobrancaGrupo(
        grupoSelecionado.id,
        payloadEmissao,
      );
      setSimulacao(res);
      const nextValores: ValorPorMembro = {};
      for (const item of res.itens) {
        nextValores[item.contratoId] = item.valorNominal;
      }
      setValoresMembro(nextValores);
      if (!res.prontoParaEmitir) {
        toast.warning(
          "Algumas parcelas não puderam ser calculadas automaticamente. Informe o valor manualmente ou sincronize os índices em Financeiro → IGP-M.",
        );
      }
    } catch (e) {
      setSimulacao(null);
      toast.error(e instanceof Error ? e.message : "Falha na simulação.");
    } finally {
      setSimulando(false);
    }
  }

  async function emitir() {
    if (!grupoSelecionado || !payloadEmissao || !podeEmitir) return;
    setEmitindo(true);
    try {
      const res = await finService.emitirCobrancaGrupo(grupoSelecionado.id, payloadEmissao);
      toast.success(`Boleto consolidado emitido — ${formatMoney(res.valorTotal)}`);
      router.push(`/dashboard/financeiro/titulos?highlight=${res.titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao emitir boleto.");
    } finally {
      setEmitindo(false);
    }
  }

  async function criarLoteRascunhos() {
    if (!grupoSelecionado || !podeCriarLote || quantidadeLote == null) return;
    setCriandoLote(true);
    try {
      const res = await finService.criarTitulosLoteCobrancaGrupo(grupoSelecionado.id, {
        convenioId: convenioId ?? undefined,
        quantidadeParcelas: quantidadeLote,
        dataPrimeiraParcela: dataPrimeiraLote ? formatDateIso(dataPrimeiraLote) : undefined,
      });
      toast.success(
        `${res.quantidade} rascunho(s) consolidado(s) criado(s) (parcelas ${res.parcelaInicial}–${res.parcelaFinal}).`,
      );
      const primeiro = res.titulos[0]?.id;
      router.push(
        primeiro
          ? `/dashboard/financeiro/titulos?highlight=${primeiro}&status=RASCUNHO`
          : "/dashboard/financeiro/titulos?status=RASCUNHO",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar lote de rascunhos.");
    } finally {
      setCriandoLote(false);
    }
  }

  async function salvarLegadoManual() {
    if (!grupoSelecionado || !podeSalvarLegado || parcelaLider == null || !vencimentoLegado) {
      return;
    }
    const membros = buildMembrosPayload(grupoSelecionado, valoresMembro, true);
    if (!membros) return;
    setSalvandoLegado(true);
    try {
      const res = await finService.criarTituloLegadoManualCobrancaGrupo(grupoSelecionado.id, {
        numeroParcela: parcelaLider,
        vencimento: formatDateIso(vencimentoLegado),
        membros,
        convenioId: convenioId ?? undefined,
        statusFinal: statusLegado,
        observacao: observacaoLegado.trim() || undefined,
        ...(statusLegado === "PAGO" && valorPagoLegado != null && dataPagamentoLegado
          ? {
              valorPago: valorPagoLegado,
              dataPagamento: formatDateIso(dataPagamentoLegado),
            }
          : {}),
      });
      toast.success(
        `Título legado consolidado — ${formatMoney(res.valorTotal)} (parc. ${res.titulo.numeroParcela}, ${res.titulo.status}).`,
      );
      router.push(`/dashboard/financeiro/titulos?highlight=${res.titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no lançamento legado.");
    } finally {
      setSalvandoLegado(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-white/40 px-1">Carregando grupos de cobrança legado…</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sugestoes.length > 0 || grupos.length === 0 ? (
        <section className={CARD_CLASS}>
          {grupos.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-center justify-between gap-3 mb-0">
                <div>
                  <h2 className="text-lg font-semibold text-white">Sugestões automáticas</h2>
                  <p className="text-sm text-white/40 mt-1">
                    {sugestoes.length} pendente{sugestoes.length === 1 ? "" : "s"} — expandir para
                    criar novo grupo
                  </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-white/30 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="mt-4 pt-4 border-t border-white/8">
                <SugestoesLista
                  sugestoes={sugestoes}
                  liderPorSugestao={liderPorSugestao}
                  setLiderPorSugestao={setLiderPorSugestao}
                  criandoId={criandoId}
                  criarGrupo={criarGrupo}
                />
              </div>
            </details>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Sugestões automáticas</h2>
              <p className="text-sm text-white/40 mb-4 max-w-3xl">
                Contratos <span className="text-white/60">LEGADO_MANUAL</span> com o mesmo CTR base
                (ex.: 099/2020-1 e 099/2020-2). Escolha o contrato líder e crie o grupo para emitir
                um único boleto com valores somados.
              </p>
              <SugestoesLista
                sugestoes={sugestoes}
                liderPorSugestao={liderPorSugestao}
                setLiderPorSugestao={setLiderPorSugestao}
                criandoId={criandoId}
                criarGrupo={criarGrupo}
              />
            </>
          )}
        </section>
      ) : null}

      <section className={CARD_CLASS}>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Grupos ativos</h2>
          <p className="text-sm text-white/40 mt-1 max-w-2xl">
            Selecione um grupo à esquerda e escolha a ação: emitir boleto, criar rascunhos ou
            lançamento legado.
          </p>
        </div>

        {grupos.length === 0 ? (
          <p className="text-sm text-white/35">Nenhum grupo ativo. Crie um a partir das sugestões.</p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
            <aside className="flex flex-col gap-2 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto pr-1">
              {grupos.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrupoSelecionadoId(g.id)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    grupoSelecionadoId === g.id
                      ? "border-blue-400/50 bg-blue-500/10"
                      : "border-white/10 hover:border-white/20 bg-black/15"
                  }`}
                >
                  <p className="font-mono text-white">{g.numeroContratoBase}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {g.contratanteNome} · {g.membros.length} lotes
                  </p>
                </button>
              ))}
            </aside>

            {grupoSelecionado ? (
              <div className="flex flex-col gap-5 min-w-0">
                <div className={SUBCARD_CLASS}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                    Grupo selecionado
                  </p>
                  <p className="font-mono text-white text-xl mt-1">
                    {grupoSelecionado.numeroContratoBase}
                  </p>
                  <p className="text-sm text-white/45 mt-2">
                    {grupoSelecionado.contratanteNome} · {grupoSelecionado.empreendimento}
                  </p>
                  <p className="text-xs text-white/35 mt-2">
                    Líder:{" "}
                    {grupoSelecionado.membros.find(
                      (m) => m.contratoId === grupoSelecionado.contratoLiderId,
                    )?.numeroContrato ?? grupoSelecionado.contratoLiderId}
                    {" · "}
                    Todos os lotes seguem a parcela do líder.
                  </p>
                </div>

                <div className={SUBCARD_CLASS}>
                  <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-white/85">Valores por lote</h3>
                      <p className="text-xs text-white/35 mt-1">
                        Calcule automaticamente ou informe manualmente — compartilhado entre as
                        ações.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 shrink-0">
                      <FormField label="Parcela (líder)" className="w-[5.25rem]">
                        <InputNumber
                          value={parcelaLider}
                          onValueChange={(e) => {
                            setSimulacao(null);
                            setParcelaLider(e.value ?? null);
                          }}
                          min={1}
                          className="w-full"
                          inputClassName="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                          useGrouping={false}
                        />
                      </FormField>
                      <div className="flex flex-col gap-2">
                        <span
                          className={`${FORM_LABEL_CLASS} invisible select-none`}
                          aria-hidden="true"
                        >
                          Ação
                        </span>
                        <button
                          type="button"
                          className={`${BTN_SECONDARY} whitespace-nowrap px-4`}
                          disabled={!podeCalcular || simulando}
                          title={motivoCalcularBloqueado ?? undefined}
                          onClick={() => void calcularValores()}
                        >
                          {simulando ? "Calculando…" : "Calcular"}
                        </button>
                        <button
                          type="button"
                          className={`${BTN_SECONDARY} whitespace-nowrap px-4`}
                          disabled={!simulacao || simulando}
                          title={
                            simulacao
                              ? "Ver evolução das parcelas e índices aplicados"
                              : "Calcule os valores primeiro"
                          }
                          onClick={() => setCalculoDetalheModalOpen(true)}
                        >
                          Ver cálculo
                        </button>
                      </div>
                    </div>
                  </div>
                  {motivoCalcularBloqueado && !podeCalcular ? (
                    <p className="text-xs text-white/40 -mt-2 mb-4">{motivoCalcularBloqueado}</p>
                  ) : null}
                  {resumoCalculoIndice?.calculoAutomaticoIndisponivel ? (
                    <AvisoCalculoIndiceBanner resumo={resumoCalculoIndice} />
                  ) : null}
                  <div className="overflow-x-auto -mx-1 px-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
                          <th className="pb-2 pr-3">Contrato</th>
                          <th className="pb-2 pr-3">Lote</th>
                          <th className="pb-2">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupoSelecionado.membros.map((m) => (
                          <tr key={m.contratoId} className="border-t border-white/5">
                            <td className="py-2.5 pr-3 font-mono text-white/90">
                              {m.numeroContrato}
                              {m.contratoId === grupoSelecionado.contratoLiderId ? (
                                <span className="ml-2 text-[10px] uppercase text-blue-300">
                                  Líder
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2.5 pr-3 text-white/50">
                              {loteLabel(m.quadra, m.lote)}
                            </td>
                            <td className="py-2.5">
                              <InputNumber
                                value={valoresMembro[m.contratoId] ?? null}
                                onValueChange={(e) => {
                                  setValoresMembro((prev) => ({
                                    ...prev,
                                    [m.contratoId]: e.value ?? null,
                                  }));
                                }}
                                mode="currency"
                                currency="BRL"
                                locale="pt-BR"
                                minFractionDigits={2}
                                maxFractionDigits={2}
                                min={0.01}
                                placeholder={
                                  resumoCalculoIndice?.calculoAutomaticoIndisponivel
                                    ? "Informar valor manual"
                                    : "Calcular ou informar"
                                }
                                className="w-full min-w-[9rem]"
                                inputClassName="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                              />
                              {avisoPorMembro[m.contratoId] ? (
                                <p
                                  className="mt-1 text-[10px] leading-snug text-amber-300/80 max-w-xs"
                                  title={avisoPorMembro[m.contratoId] ?? undefined}
                                >
                                  {resumirAvisoIndiceLinha(avisoPorMembro[m.contratoId]!)}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {simulacao || valorTotalConsolidado != null ? (
                    <div
                      className={`mt-4 rounded-xl border p-4 ${
                        podeEmitir
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-amber-500/25 bg-amber-500/5"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          podeEmitir ? "text-emerald-200/90" : "text-amber-200/90"
                        }`}
                      >
                        Total consolidado:{" "}
                        {formatMoney(valorTotalConsolidado ?? simulacao?.valorTotal)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div
                  className="flex flex-wrap gap-2 border-b border-white/10 pb-0.5"
                  role="tablist"
                  aria-label="Ações do grupo"
                >
                  {ACOES_GRUPO.map((acao) => (
                    <button
                      key={acao.id}
                      type="button"
                      role="tab"
                      aria-selected={acaoGrupo === acao.id}
                      onClick={() => setAcaoGrupo(acao.id)}
                      className={`rounded-t-xl border px-4 py-2.5 text-left transition-colors min-w-[9rem] flex-1 sm:flex-none ${
                        acaoGrupo === acao.id ? TAB_ACTIVE : TAB_IDLE
                      }`}
                    >
                      <span className="block text-sm font-medium">{acao.label}</span>
                      <span className="block text-[10px] text-white/35 mt-0.5 leading-snug">
                        {acao.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {acaoGrupo === "emitir" ? (
                  <div className={`${SUBCARD_CLASS} flex flex-col gap-5`} role="tabpanel">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Convênio">
                        <Dropdown
                          value={convenioId}
                          options={convenioOptions}
                          onChange={(e) => setConvenioId(e.value ?? null)}
                          placeholder="Selecione"
                          className="w-full"
                          pt={DROPDOWN_PT}
                        />
                      </FormField>
                      <FormField
                        label="Vencimento"
                        hint={
                          carregandoContextoEmissao
                            ? "A carregar vencimento sugerido…"
                            : "Hoje ou data futura."
                        }
                      >
                        <DashboardCalendar
                          value={vencimento}
                          onChange={(e) => setVencimento(normalizarDataCalendario(e.value))}
                          minDate={inicioDoDiaHoje()}
                          placeholder="00/00/0000"
                          mask="99/99/9999"
                          disabled={carregandoContextoEmissao}
                        />
                      </FormField>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={BTN_SECONDARY}
                        disabled={!podeSimular || simulando || carregandoContextoEmissao}
                        onClick={() => void simular()}
                      >
                        {simulando ? "Simulando…" : "Simular emissão"}
                      </button>
                      <button
                        type="button"
                        className={BTN_PRIMARY}
                        disabled={!podeEmitir || emitindo}
                        onClick={() => void emitir()}
                      >
                        {emitindo ? "Emitindo…" : "Emitir boleto consolidado"}
                      </button>
                    </div>
                    {motivoSimularBloqueado && !podeSimular ? (
                      <p className="text-xs text-white/40">{motivoSimularBloqueado}</p>
                    ) : null}

                    {simulacao ? (
                      <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                        {simulacao && !simulacao.prontoParaEmitir && resumoCalculoIndice ? (
                          <p className="text-xs text-amber-200/75 mb-3 leading-relaxed">
                            {resumoCalculoIndice.tituloBanner}. {resumoCalculoIndice.dicaAcao}
                          </p>
                        ) : simulacao && !simulacao.prontoParaEmitir ? (
                          <p className="text-xs text-amber-200/75 mb-3">
                            Informe o valor de cada lote com aviso ou sincronize a série em
                            Financeiro → IGP-M / IPCA.
                          </p>
                        ) : null}
                        <ul className="text-xs text-white/55 space-y-1.5">
                          {simulacao.itens.map((item) => (
                            <li key={item.contratoId}>
                              {item.numeroContrato} · parc. {item.numeroParcela}:{" "}
                              {formatMoney(item.valorNominal)}
                              {item.aviso ? (
                                <span
                                  className="text-amber-300/80"
                                  title={item.aviso}
                                >
                                  {" "}
                                  — {resumirAvisoIndiceLinha(item.aviso)}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <p className="text-xs text-white/30 leading-relaxed">
                      Após a baixa do boleto líder, parcelas dos demais lotes são marcadas como
                      pagas automaticamente (títulos sombra).
                    </p>
                  </div>
                ) : null}

                {acaoGrupo === "lote" ? (
                  <div className={`${SUBCARD_CLASS} flex flex-col gap-4`} role="tabpanel">
                    <p className="text-sm text-white/50 leading-relaxed">
                      Equivalente ao botão <span className="text-white/70">NOVO</span> na lista de
                      títulos: cria várias parcelas em rascunho no contrato líder, com rateio por
                      membro. Registre ou emita depois na lista de títulos.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
                        <div className="flex flex-col gap-2 w-full sm:w-[5.25rem] shrink-0">
                          <label className={FORM_LABEL_CLASS}>Quantidade</label>
                          <InputNumber
                            value={quantidadeLote}
                            onValueChange={(e) => setQuantidadeLote(e.value ?? null)}
                            min={1}
                            max={maxParcelasLote}
                            className="w-full"
                            inputClassName={FORM_INPUT_CLASS}
                            useGrouping={false}
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-[11.5rem] shrink-0">
                          <label className={FORM_LABEL_CLASS}>1ª parcela (vencimento)</label>
                          <DashboardCalendar
                            value={dataPrimeiraLote}
                            onChange={(e) => setDataPrimeiraLote(normalizarDataCalendario(e.value))}
                            placeholder="00/00/0000"
                            mask="99/99/9999"
                            className="w-full"
                          />
                        </div>
                        <button
                          type="button"
                          className={`${BTN_SECONDARY} w-full sm:w-auto shrink-0 whitespace-nowrap px-5`}
                          disabled={!podePrevisualizarLote || carregandoContextoEmissao}
                          onClick={() => setPreviewLoteModalOpen(true)}
                        >
                          Pré-visualizar
                        </button>
                        <button
                          type="button"
                          className={`${BTN_SECONDARY} w-full sm:w-auto shrink-0 whitespace-nowrap px-5`}
                          disabled={!podeCriarLote || criandoLote}
                          onClick={() => void criarLoteRascunhos()}
                        >
                          {criandoLote ? "Criando…" : "Criar rascunhos"}
                        </button>
                      </div>
                      <p className="text-xs text-white/35 leading-relaxed sm:ml-[calc(5.25rem+1rem)] sm:max-w-[11.5rem]">
                        Opcional — usa sugestão do contrato quando vazio.
                      </p>
                      {contextoLider && maxParcelasLote < 12 ? (
                        <p className="text-xs text-violet-200/70 leading-relaxed">
                          Até {maxParcelasLote} parcela(s) neste lote (limite até a próxima de
                          reajuste, parcela {contextoLider.parcelaReajusteLimite}).
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {acaoGrupo === "legado" ? (
                  <div className={`${SUBCARD_CLASS} flex flex-col gap-5`} role="tabpanel">
                    <p className="text-sm text-white/50 leading-relaxed">
                      Importa parcelas históricas já emitidas ou quitadas (vencimento retroativo
                      permitido). Use a tabela de valores acima e informe status e pagamento quando
                      aplicável.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Vencimento (legado)">
                        <DashboardCalendar
                          value={vencimentoLegado}
                          onChange={(e) => setVencimentoLegado(normalizarDataCalendario(e.value))}
                          placeholder="00/00/0000"
                          mask="99/99/9999"
                        />
                      </FormField>
                      <FormField label="Status final">
                        <Dropdown
                          value={statusLegado}
                          options={STATUS_LEGADO_OPTIONS}
                          onChange={(e) =>
                            setStatusLegado((e.value as TituloLegadoManualStatus) ?? "EMITIDO")
                          }
                          className="w-full"
                          pt={DROPDOWN_PT}
                        />
                      </FormField>
                    </div>
                    {statusLegado === "PAGO" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Valor pago (total consolidado)">
                          <InputNumber
                            value={valorPagoLegado}
                            onValueChange={(e) => setValorPagoLegado(e.value ?? null)}
                            mode="currency"
                            currency="BRL"
                            locale="pt-BR"
                            minFractionDigits={2}
                            className="w-full"
                            inputClassName={FORM_INPUT_CLASS}
                          />
                        </FormField>
                        <FormField label="Data pagamento">
                          <DashboardCalendar
                            value={dataPagamentoLegado}
                            onChange={(e) =>
                              setDataPagamentoLegado(normalizarDataCalendario(e.value))
                            }
                            placeholder="00/00/0000"
                            mask="99/99/9999"
                          />
                        </FormField>
                      </div>
                    ) : null}
                    <FormField label="Observação">
                      <InputText
                        value={observacaoLegado}
                        onChange={(e) => setObservacaoLegado(e.target.value)}
                        className={FORM_INPUT_CLASS}
                        placeholder="Opcional"
                      />
                    </FormField>
                    {totalLegadoConsolidado != null ? (
                      <p className="text-xs text-white/45">
                        Total consolidado (soma dos lotes): {formatMoney(totalLegadoConsolidado)}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-300/75">
                        Informe o valor de cada lote na tabela acima (ou use Simular emissão).
                      </p>
                    )}
                    <div>
                      <button
                        type="button"
                        className="rounded-xl bg-amber-600/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
                        disabled={!podeSalvarLegado || salvandoLegado}
                        onClick={() => void salvarLegadoManual()}
                      >
                        {salvandoLegado ? "Lançando…" : "Lançar título legado consolidado"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className={`${SUBCARD_CLASS} flex flex-col items-center justify-center min-h-[16rem] text-center`}
              >
                <p className="text-sm text-white/45">Selecione um grupo na lista ao lado.</p>
                <p className="text-xs text-white/30 mt-2 max-w-xs">
                  Em seguida escolha emitir boleto, criar rascunhos em lote ou lançamento legado.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="text-xs text-white/25 px-1">
        Contratos em grupo não podem receber boletos avulsos ou em lote pela lista de títulos — use
        esta tela (emissão, rascunhos em lote ou lançamento legado).{" "}
        <Link href="/dashboard/financeiro/titulos" className="text-blue-400/80 hover:underline">
          Ver títulos
        </Link>
      </p>

      <CobrancaGrupoLotePreviewDialog
        visible={previewLoteModalOpen}
        onHide={() => setPreviewLoteModalOpen(false)}
        grupo={grupoSelecionado}
        previewLote={previewLoteGrupo}
        convenioId={convenioId}
        convenioNome={convenioNomeSelecionado}
        numeroContratoLider={contextoLider?.numeroContrato}
      />

      <CobrancaGrupoCalculoDetalheDialog
        visible={calculoDetalheModalOpen}
        onHide={() => setCalculoDetalheModalOpen(false)}
        grupo={grupoSelecionado}
        simulacao={simulacao}
        parcelaAlvo={parcelaLider}
        vencimentoEmissao={
          vencimento && isVencimentoFuturo(vencimento) ? vencimento : inicioDoDiaHoje()
        }
      />
    </div>
  );
}
