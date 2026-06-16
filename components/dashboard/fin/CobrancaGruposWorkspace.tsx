"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { toast } from "sonner";
import {
  finService,
  type CobrancaGrupo,
  type CobrancaGrupoEmitirPayload,
  type CobrancaGrupoEmitirSimulacao,
  type CobrancaGrupoSugestao,
  type ConvenioBanco,
  type EmpreendimentoConvenioItem,
} from "@/lib/fin-service";
import { convenioEmpreendimentoDropdownOptions } from "@/lib/convenio-label";
import { inicioDoDiaHoje, isVencimentoFuturo, normalizarDataCalendario } from "@/lib/fin-vencimento";

const CARD_CLASS =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm";
const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";
const DROPDOWN_PT = { input: { className: FORM_INPUT_CLASS } };
const BTN_PRIMARY =
  "rounded-xl bg-blue-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40";
const BTN_SECONDARY =
  "rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-40";

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

function loteLabel(quadra?: string | null, lote?: number | null): string {
  if (!quadra && lote == null) return "—";
  return `Q${quadra ?? "?"} L${lote ?? "?"}`;
}

type ParcelaPorMembro = Record<number, number>;
type ValorPorMembro = Record<number, number | null>;

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
  const [parcelas, setParcelas] = useState<ParcelaPorMembro>({});
  const [valoresMembro, setValoresMembro] = useState<ValorPorMembro>({});
  const [convenioId, setConvenioId] = useState<string | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [simulacao, setSimulacao] = useState<CobrancaGrupoEmitirSimulacao | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [emitindo, setEmitindo] = useState(false);

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
      const [g, s, c, vinculos] = await Promise.all([
        finService.listCobrancaGrupos({ skipLoading: true }),
        finService.listCobrancaGruposSugestoes({ skipLoading: true }),
        finService.listConvenios(),
        finService.listEmpreendimentoConvenios(),
      ]);
      setGrupos(g);
      setSugestoes(s.filter((x) => !x.jaPossuiGrupoAtivo));
      setConvenios(c);
      setEmpreendimentoConvenios(vinculos);
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
      setParcelas({});
      setValoresMembro({});
      setSimulacao(null);
      return;
    }
    const next: ParcelaPorMembro = {};
    for (const m of grupoSelecionado.membros) {
      next[m.contratoId] = m.proximaParcela;
    }
    setParcelas(next);
    setValoresMembro({});
    setSimulacao(null);
    const vinculo = empreendimentoConvenios.find(
      (v) =>
        v.nomeEmpreendimento.toLowerCase() === grupoSelecionado.empreendimento.toLowerCase(),
    );
    setConvenioId(vinculo?.convenioId ?? null);
  }, [grupoSelecionado, empreendimentoConvenios]);

  const payloadEmissao = useMemo((): CobrancaGrupoEmitirPayload | null => {
    if (!grupoSelecionado || !convenioId || !vencimento) return null;
    const membros = grupoSelecionado.membros.map((m) => {
      const base = {
        contratoId: m.contratoId,
        numeroParcela: parcelas[m.contratoId] ?? m.proximaParcela,
      };
      const valor = valoresMembro[m.contratoId];
      if (valor != null && valor >= 0.01) {
        return { ...base, valorNominal: valor };
      }
      return base;
    });
    return {
      convenioId,
      vencimento: formatDateIso(vencimento),
      membros,
    };
  }, [grupoSelecionado, convenioId, vencimento, parcelas, valoresMembro]);

  const avisoPorMembro = useMemo(() => {
    const map: Record<number, string | null> = {};
    if (simulacao) {
      for (const item of simulacao.itens) {
        if (item.aviso) map[item.contratoId] = item.aviso;
      }
    }
    return map;
  }, [simulacao]);

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

  const podeSimular =
    payloadEmissao != null && vencimento != null && isVencimentoFuturo(vencimento);

  const podeEmitir =
    podeSimular &&
    grupoSelecionado != null &&
    grupoSelecionado.membros.every((m) => {
      const v = valoresMembro[m.contratoId];
      return v != null && v >= 0.01;
    });

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

  if (loading) {
    return (
      <p className="text-sm text-white/40 px-1">Carregando grupos de cobrança legado…</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className={CARD_CLASS}>
        <h2 className="text-lg font-semibold text-white mb-1">Sugestões automáticas</h2>
        <p className="text-sm text-white/40 mb-4 max-w-3xl">
          Contratos <span className="text-white/60">LEGADO_MANUAL</span> com o mesmo CTR base
          (ex.: 099/2020-1 e 099/2020-2). Escolha o contrato líder e crie o grupo para emitir um
          único boleto com valores somados.
        </p>
        {sugestoes.length === 0 ? (
          <p className="text-sm text-white/35">Nenhuma sugestão pendente.</p>
        ) : (
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
                          <p className="text-sm text-white font-mono truncate">
                            {c.numeroContrato}
                          </p>
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
        )}
      </section>

      <section className={CARD_CLASS}>
        <h2 className="text-lg font-semibold text-white mb-1">Grupos ativos</h2>
        {grupos.length === 0 ? (
          <p className="text-sm text-white/35">Nenhum grupo ativo. Crie um a partir das sugestões.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex flex-col gap-2">
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
            </div>

            {grupoSelecionado ? (
              <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm text-white/50">Emissão consolidada</p>
                  <p className="font-mono text-white text-lg">{grupoSelecionado.numeroContratoBase}</p>
                  <p className="text-xs text-white/40 mt-1">
                    Líder:{" "}
                    {grupoSelecionado.membros.find((m) => m.contratoId === grupoSelecionado.contratoLiderId)
                      ?.numeroContrato ?? grupoSelecionado.contratoLiderId}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
                        <th className="pb-2 pr-3">Contrato</th>
                        <th className="pb-2 pr-3">Lote</th>
                        <th className="pb-2 pr-3">Parcela</th>
                        <th className="pb-2">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupoSelecionado.membros.map((m) => (
                        <tr key={m.contratoId} className="border-t border-white/5">
                          <td className="py-2 pr-3 font-mono text-white/90">
                            {m.numeroContrato}
                            {m.contratoId === grupoSelecionado.contratoLiderId ? (
                              <span className="ml-2 text-[10px] uppercase text-blue-300">Líder</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 text-white/50">
                            {loteLabel(m.quadra, m.lote)}
                          </td>
                          <td className="py-2 pr-3">
                            <InputNumber
                              value={parcelas[m.contratoId] ?? m.proximaParcela}
                              onValueChange={(e) => {
                                setSimulacao(null);
                                setParcelas((prev) => ({
                                  ...prev,
                                  [m.contratoId]: e.value ?? m.proximaParcela,
                                }));
                              }}
                              min={1}
                              className="w-24"
                              inputClassName="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                            />
                          </td>
                          <td className="py-2">
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
                              placeholder="Calcular ou informar"
                              className="w-full min-w-[9rem]"
                              inputClassName="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
                            />
                            {avisoPorMembro[m.contratoId] ? (
                              <p className="mt-1 text-[10px] leading-snug text-amber-300/80 max-w-xs">
                                {avisoPorMembro[m.contratoId]}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Convênio</label>
                    <Dropdown
                      value={convenioId}
                      options={convenioOptions}
                      onChange={(e) => setConvenioId(e.value ?? null)}
                      placeholder="Selecione"
                      className="w-full"
                      pt={DROPDOWN_PT}
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Vencimento</label>
                    <Calendar
                      value={vencimento}
                      onChange={(e) => setVencimento(normalizarDataCalendario(e.value))}
                      dateFormat="dd/mm/yy"
                      minDate={inicioDoDiaHoje()}
                      showIcon
                      className="w-full"
                      inputClassName={FORM_INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={!podeSimular || simulando}
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

                {simulacao || valorTotalConsolidado != null ? (
                  <div
                    className={`rounded-xl border p-4 ${
                      podeEmitir
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-amber-500/25 bg-amber-500/5"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium mb-2 ${
                        podeEmitir ? "text-emerald-200/90" : "text-amber-200/90"
                      }`}
                    >
                      Total consolidado:{" "}
                      {formatMoney(valorTotalConsolidado ?? simulacao?.valorTotal)}
                    </p>
                    {simulacao && !simulacao.prontoParaEmitir ? (
                      <p className="text-xs text-amber-200/75 mb-2">
                        Informe o valor de cada lote com aviso ou sincronize a série IGPM em
                        Financeiro → IGP-M.
                      </p>
                    ) : null}
                    {simulacao ? (
                      <ul className="text-xs text-white/55 space-y-1">
                        {simulacao.itens.map((item) => (
                          <li key={item.contratoId}>
                            {item.numeroContrato} · parc. {item.numeroParcela}:{" "}
                            {formatMoney(item.valorNominal)}
                            {item.aviso ? (
                              <span className="text-amber-300/80"> — {item.aviso}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-xs text-white/30">
                  Após a baixa do boleto líder, parcelas dos demais lotes são marcadas como pagas
                  automaticamente (títulos sombra).
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/35 self-center">Selecione um grupo para emitir.</p>
            )}
          </div>
        )}
      </section>

      <p className="text-xs text-white/25 px-1">
        Contratos em grupo não podem receber boletos avulsos ou em lote — use esta tela.{" "}
        <Link href="/dashboard/financeiro/titulos" className="text-blue-400/80 hover:underline">
          Ver títulos
        </Link>
      </p>
    </div>
  );
}
