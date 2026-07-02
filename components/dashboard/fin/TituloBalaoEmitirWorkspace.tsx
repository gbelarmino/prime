"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import {
  finService,
  formatContratoRef,
  formatTituloParcelaLabel,
  type ContratoBalaoPendenteItem,
  type ConvenioBanco,
  type TituloBalaoEmissaoPreview,
  type TituloContextoLote,
} from "@/lib/fin-service";
import { convenioEmpreendimentoDropdownOptions } from "@/lib/convenio-label";
import {
  dashboardCellMono,
  dashboardCellText,
} from "@/lib/dashboard-datatable";
import { TituloBalaoCorrecaoDetalhe } from "@/components/dashboard/fin/TituloBalaoCorrecaoDetalhe";
import {
  inicioDoDiaHoje,
  isVencimentoFuturo,
  normalizarDataCalendario,
  parseIsoDate,
} from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";
const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
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

function convenioPorId(
  convenios: ConvenioBanco[],
  id: string | null | undefined,
): ConvenioBanco | undefined {
  if (!id) return undefined;
  return convenios.find((c) => c.id === id);
}

export function TituloBalaoEmitirWorkspace() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [convenios, setConvenios] = useState<ConvenioBanco[]>([]);
  const [conveniosLoading, setConveniosLoading] = useState(true);
  const [selectedConvenioId, setSelectedConvenioId] = useState<string | null>(null);

  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(true);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string | null>(null);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [selectedQuadra, setSelectedQuadra] = useState<string | null>(null);
  const [lotes, setLotes] = useState<number[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [selectedLote, setSelectedLote] = useState<number | null>(null);

  const [contexto, setContexto] = useState<TituloContextoLote | null>(null);
  const [contextoLoading, setContextoLoading] = useState(false);
  const [baloes, setBaloes] = useState<ContratoBalaoPendenteItem[]>([]);
  const [baloesLoading, setBaloesLoading] = useState(false);
  const [numeroBalao, setNumeroBalao] = useState<number | null>(null);
  const [preview, setPreview] = useState<TituloBalaoEmissaoPreview | null>(null);
  const [vencimentoOverride, setVencimentoOverride] = useState<Date | null>(null);
  const [usarVencimentoCustom, setUsarVencimentoCustom] = useState(false);

  const convenioOptions = useMemo(
    () => convenioEmpreendimentoDropdownOptions(convenios),
    [convenios],
  );

  const convenioSelecionado = convenioPorId(convenios, selectedConvenioId);

  const balaoOptions = useMemo(
    () =>
      baloes.map((b) => ({
        label: `B${b.numeroBalao} · ${formatMoney(b.valorNominal)} · ref. parcela ${b.parcelaReferencia}${
          b.jaEmitido ? " (já emitido)" : ""
        }`,
        value: b.numeroBalao,
        disabled: b.jaEmitido,
      })),
    [baloes],
  );

  const balaoSelecionado = baloes.find((b) => b.numeroBalao === numeroBalao) ?? null;

  const vencimentoEfetivo = usarVencimentoCustom && vencimentoOverride
    ? vencimentoOverride
    : preview?.vencimento
      ? parseIsoDate(preview.vencimento)
      : balaoSelecionado
        ? parseIsoDate(balaoSelecionado.vencimento)
        : null;

  const podeEmitir =
    contexto != null &&
    selectedConvenioId != null &&
    numeroBalao != null &&
    balaoSelecionado != null &&
    !balaoSelecionado.jaEmitido &&
    preview != null &&
    !preview.jaEmitido &&
    vencimentoEfetivo != null &&
    (!usarVencimentoCustom || isVencimentoFuturo(vencimentoEfetivo)) &&
    !contexto.avisoConvenio &&
    (!contexto.convenioId || contexto.convenioId === selectedConvenioId);

  useEffect(() => {
    Promise.all([
      finService.listConvenios(),
      finService.listEmpreendimentos({ skipLoading: true }),
    ])
      .then(([conv, emps]) => {
        setConvenios(conv);
        setEmpreendimentos(emps);
      })
      .catch(() => toast.error("Falha ao carregar dados iniciais."))
      .finally(() => {
        setConveniosLoading(false);
        setEmpreendimentosLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedEmpreendimento) {
      setQuadras([]);
      return;
    }
    setQuadrasLoading(true);
    finService
      .listQuadrasImovel({ empreendimento: selectedEmpreendimento }, { skipLoading: true })
      .then(setQuadras)
      .catch(() => toast.error("Falha ao carregar quadras."))
      .finally(() => setQuadrasLoading(false));
  }, [selectedEmpreendimento]);

  useEffect(() => {
    if (!selectedEmpreendimento || !selectedQuadra) {
      setLotes([]);
      return;
    }
    setLotesLoading(true);
    finService
      .listLotesImovel(
        { empreendimento: selectedEmpreendimento, quadra: selectedQuadra },
        { skipLoading: true },
      )
      .then(setLotes)
      .catch(() => toast.error("Falha ao carregar lotes."))
      .finally(() => setLotesLoading(false));
  }, [selectedEmpreendimento, selectedQuadra]);

  useEffect(() => {
    if (!selectedEmpreendimento || !selectedQuadra || selectedLote == null) {
      setContexto(null);
      setBaloes([]);
      return;
    }
    setContextoLoading(true);
    finService
      .contextoLote(selectedEmpreendimento, selectedQuadra, selectedLote)
      .then((ctx) => {
        setContexto(ctx);
        if (ctx.convenioId) {
          setSelectedConvenioId(ctx.convenioId);
        }
      })
      .catch((e) => {
        setContexto(null);
        setBaloes([]);
        toast.error(e instanceof Error ? e.message : "Lote sem contrato ativo para cobrança.");
      })
      .finally(() => setContextoLoading(false));
  }, [selectedEmpreendimento, selectedQuadra, selectedLote]);

  useEffect(() => {
    if (!contexto) {
      setBaloes([]);
      setNumeroBalao(null);
      setPreview(null);
      return;
    }
    setBaloesLoading(true);
    finService
      .listBaloesPendentes(contexto.contratoId)
      .then((items) => {
        setBaloes(items);
        const primeiroDisponivel = items.find((b) => !b.jaEmitido);
        setNumeroBalao(primeiroDisponivel?.numeroBalao ?? items[0]?.numeroBalao ?? null);
        if (items.length === 0) {
          toast.info("Contrato sem balões configurados.");
        }
      })
      .catch(() => toast.error("Falha ao carregar balões do contrato."))
      .finally(() => setBaloesLoading(false));
  }, [contexto]);

  useEffect(() => {
    if (!contexto || numeroBalao == null) {
      setPreview(null);
      return;
    }
    finService
      .simularTituloBalao(contexto.contratoId, numeroBalao)
      .then(setPreview)
      .catch(() => {
        setPreview(null);
        toast.error("Falha ao simular emissão do balão.");
      });
  }, [contexto, numeroBalao]);

  useEffect(() => {
    setUsarVencimentoCustom(false);
    setVencimentoOverride(null);
  }, [numeroBalao]);

  const emitir = async () => {
    if (!contexto || !selectedConvenioId || numeroBalao == null || !vencimentoEfetivo) {
      toast.error("Selecione contrato, convênio e balão.");
      return;
    }
    if (balaoSelecionado?.jaEmitido || preview?.jaEmitido) {
      toast.error("Este balão já possui título ativo.");
      return;
    }
    if (usarVencimentoCustom && !isVencimentoFuturo(vencimentoEfetivo)) {
      toast.error("Vencimento customizado não pode ser anterior a hoje.");
      return;
    }

    setSaving(true);
    try {
      const idempotencyKey = `contrato-${contexto.contratoId}-balao-${numeroBalao}`;
      const body = {
        contratoId: contexto.contratoId,
        numeroBalao,
        convenioId: selectedConvenioId,
        vencimento: usarVencimentoCustom ? formatDateIso(vencimentoEfetivo) : null,
      };
      const emitido = await finService.emitirTituloBalao(body, idempotencyKey);
      const rotulo = formatTituloParcelaLabel(emitido);
      toast.success(`Boleto de balão ${rotulo} emitido (status ${emitido.status}).`);
      router.push(`/dashboard/financeiro/titulos/detalhe?id=${encodeURIComponent(emitido.id)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao emitir título de balão.");
    } finally {
      setSaving(false);
    }
  };

  const resetLote = useCallback(() => {
    setSelectedQuadra(null);
    setSelectedLote(null);
    setContexto(null);
    setBaloes([]);
    setNumeroBalao(null);
    setPreview(null);
  }, []);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">
            Convênio bancário
          </h2>
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Beneficiário (convênio ativo)</label>
            <Dropdown
              value={selectedConvenioId}
              options={convenioOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setSelectedConvenioId((e.value as string | null) ?? null)}
              placeholder={conveniosLoading ? "Carregando…" : "Selecione o beneficiário"}
              filter
              filterBy="label"
              disabled={conveniosLoading || convenioOptions.length === 0}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          {convenioSelecionado ? (
            <p className="text-sm text-white/50">
              {convenioSelecionado.nomeBeneficiario?.trim() || convenioSelecionado.nome}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">
            Contrato e balão
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 sm:col-span-3">
              <label className={FORM_LABEL_CLASS}>Empreendimento</label>
              <Dropdown
                value={selectedEmpreendimento}
                options={empreendimentos.map((emp) => ({ label: emp, value: emp }))}
                onChange={(e) => {
                  setSelectedEmpreendimento(e.value ?? null);
                  resetLote();
                }}
                placeholder="Selecione"
                filter
                disabled={empreendimentosLoading}
                className="w-full"
                pt={DROPDOWN_PT}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Quadra</label>
              <Dropdown
                value={selectedQuadra}
                options={quadras.map((q) => ({ label: `Quadra ${q}`, value: q }))}
                onChange={(e) => {
                  setSelectedQuadra(e.value ?? null);
                  setSelectedLote(null);
                  setContexto(null);
                }}
                placeholder="Quadra"
                disabled={!selectedEmpreendimento || quadrasLoading}
                className="w-full"
                pt={DROPDOWN_PT}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Lote</label>
              <Dropdown
                value={selectedLote}
                options={lotes.map((l) => ({ label: String(l), value: l }))}
                onChange={(e) => setSelectedLote(e.value ?? null)}
                placeholder="Lote"
                disabled={!selectedQuadra || lotesLoading}
                className="w-full"
                pt={DROPDOWN_PT}
              />
            </div>
          </div>

          {contextoLoading || baloesLoading ? (
            <p className="text-sm text-white/40 animate-pulse">Carregando contrato…</p>
          ) : null}

          {contexto?.avisoConvenio ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              {contexto.avisoConvenio}
            </p>
          ) : null}

          {contexto && !contexto.avisoConvenio ? (
            <p className="text-sm text-white/50">
              Contrato{" "}
              <span className="font-medium text-white/80">
                {formatContratoRef(contexto.numeroContrato, contexto.contratoId)}
              </span>
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Balão</label>
            <Dropdown
              value={numeroBalao}
              options={balaoOptions}
              optionLabel="label"
              optionValue="value"
              optionDisabled="disabled"
              onChange={(e) => setNumeroBalao((e.value as number | null) ?? null)}
              placeholder={
                baloes.length === 0 ? "Nenhum balão configurado" : "Selecione o balão"
              }
              disabled={!contexto || baloes.length === 0}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          {preview ? (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Valor nominal
                </dt>
                <dd className="mt-1">{dashboardCellText(formatMoney(preview.valorNominal))}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Parcela de referência
                </dt>
                <dd className="mt-1">{dashboardCellMono(String(preview.parcelaReferencia))}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Vencimento (cronograma)
                </dt>
                <dd className="mt-1">{dashboardCellText(formatDate(preview.vencimento))}</dd>
              </div>
              {preview.jaEmitido ? (
                <div className="col-span-2 text-amber-200/90">
                  Já existe título ativo para este balão.
                </div>
              ) : null}
              {preview.correcao ? (
                <TituloBalaoCorrecaoDetalhe correcao={preview.correcao} />
              ) : null}
            </dl>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={usarVencimentoCustom}
              onChange={(e) => setUsarVencimentoCustom(e.target.checked)}
              disabled={!preview || preview.jaEmitido}
              className="rounded border-white/20 bg-white/5"
            />
            Alterar vencimento (opcional)
          </label>

          {usarVencimentoCustom ? (
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Vencimento customizado</label>
              <Calendar
                value={vencimentoOverride}
                onChange={(e) => setVencimentoOverride(normalizarDataCalendario(e.value))}
                dateFormat="dd/mm/yy"
                showIcon
                minDate={inicioDoDiaHoje()}
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
        <Link
          href="/dashboard/financeiro/titulos"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 no-underline transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
        >
          Voltar aos títulos
        </Link>
        <button
          type="button"
          disabled={saving || !podeEmitir || contextoLoading || baloesLoading}
          onClick={() => void emitir()}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? "A emitir…" : "Emitir boleto de balão"}
        </button>
      </div>
    </div>
  );
}
