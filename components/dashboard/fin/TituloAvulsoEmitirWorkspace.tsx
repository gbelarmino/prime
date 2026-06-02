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
  formatContratoRef,
  type ConvenioBanco,
  type TituloContextoLote,
} from "@/lib/fin-service";
import {
  convenioEmpreendimentoDropdownOptions,
} from "@/lib/convenio-label";
import { parseIsoDate } from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";
const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
};

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

export function TituloAvulsoEmitirWorkspace() {
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
  const [numeroParcela, setNumeroParcela] = useState<number | null>(null);
  const [valorNominal, setValorNominal] = useState<number | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);

  const convenioOptions = useMemo(
    () => convenioEmpreendimentoDropdownOptions(convenios),
    [convenios],
  );

  const convenioSelecionado = convenioPorId(convenios, selectedConvenioId);

  const podeEmitir =
    contexto != null &&
    selectedConvenioId != null &&
    numeroParcela != null &&
    numeroParcela > 0 &&
    valorNominal != null &&
    valorNominal > 0 &&
    vencimento != null &&
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
      return;
    }
    setContextoLoading(true);
    finService
      .contextoLote(selectedEmpreendimento, selectedQuadra, selectedLote)
      .then((ctx) => {
        setContexto(ctx);
        setNumeroParcela(ctx.numeroParcela);
        setValorNominal(ctx.valorNominal ?? null);
        const vencIso =
          ctx.primeiroTituloLote && ctx.dataPrimeiraParcelaContrato
            ? ctx.dataPrimeiraParcelaContrato
            : ctx.vencimentoSugerido;
        setVencimento(parseIsoDate(vencIso));
        if (ctx.convenioId) {
          setSelectedConvenioId(ctx.convenioId);
        }
        if (ctx.avisoValorNominal) {
          toast.warning(ctx.avisoValorNominal);
        }
      })
      .catch((e) => {
        setContexto(null);
        toast.error(e instanceof Error ? e.message : "Lote sem contrato ativo para cobrança.");
      })
      .finally(() => setContextoLoading(false));
  }, [selectedEmpreendimento, selectedQuadra, selectedLote]);

  const emitir = async () => {
    if (!contexto || !selectedConvenioId || !vencimento || numeroParcela == null || valorNominal == null) {
      toast.error("Preencha contrato, convênio, parcela, valor e vencimento.");
      return;
    }
    if (contexto.avisoConvenio) {
      toast.error(contexto.avisoConvenio);
      return;
    }
    if (contexto.convenioId && contexto.convenioId !== selectedConvenioId) {
      toast.error("O convênio selecionado deve ser o atrelado ao empreendimento do lote.");
      return;
    }

    setSaving(true);
    try {
      const idempotencyKey = `avulso-${contexto.contratoId}-${numeroParcela}-${formatDateIso(vencimento)}`;
      const emitido = await finService.emitirTituloAvulso(
        {
          contratoId: contexto.contratoId,
          numeroParcela,
          convenioId: selectedConvenioId,
          valorNominal,
          vencimento: formatDateIso(vencimento),
        },
        idempotencyKey,
      );
      toast.success(`Boleto emitido (parcela ${emitido.numeroParcela}, status ${emitido.status}).`);
      router.push(`/dashboard/financeiro/titulos/detalhe?id=${encodeURIComponent(emitido.id)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao emitir título avulso.");
    } finally {
      setSaving(false);
    }
  };

  const resetLote = useCallback(() => {
    setSelectedQuadra(null);
    setSelectedLote(null);
    setContexto(null);
    setNumeroParcela(null);
    setValorNominal(null);
    setVencimento(null);
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
            {convenioOptions.length === 0 && !conveniosLoading ? (
              <p className="text-sm text-amber-200/80">
                Nenhum convênio ativo. Ative um convênio em Financeiro → Convênios.
              </p>
            ) : null}
          </div>

          {convenioSelecionado ? (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Agência
                </dt>
                <dd className="mt-1 text-white/80">{convenioSelecionado.agencia?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Conta
                </dt>
                <dd className="mt-1 font-mono text-xs text-white/70">
                  {convenioSelecionado.conta?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Var. carteira
                </dt>
                <dd className="mt-1 font-mono text-xs text-white/70">
                  {convenioSelecionado.variacaoCarteira?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Cooperativa
                </dt>
                <dd className="mt-1 text-white/80">
                  {convenioSelecionado.cooperativa?.trim() || "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Nome beneficiário
                </dt>
                <dd className="mt-1 text-white/80">
                  {convenioSelecionado.nomeBeneficiario?.trim() || "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  ID beneficiário
                </dt>
                <dd
                  className="mt-1 truncate font-mono text-xs text-white/70"
                  title={convenioSelecionado.beneficiario?.trim() || undefined}
                >
                  {convenioSelecionado.beneficiario?.trim() || "—"}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">
            Contrato e cobrança
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

          {contextoLoading ? (
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
              {contexto.convenioNome ? (
                <>
                  {" "}
                  · convênio do empreendimento:{" "}
                  <span className="font-medium text-white/80">{contexto.convenioNome}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Parcela</label>
              <InputNumber
                value={numeroParcela}
                onValueChange={(e) => setNumeroParcela(e.value ?? null)}
                min={1}
                useGrouping={false}
                disabled={!contexto}
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Valor nominal</label>
              <InputNumber
                value={valorNominal}
                onValueChange={(e) => setValorNominal(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                minFractionDigits={2}
                disabled={!contexto}
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>
                {contexto?.primeiroTituloLote && numeroParcela === 1
                  ? "Data da 1ª parcela"
                  : "Vencimento"}
              </label>
              <Calendar
                value={vencimento}
                onChange={(e) => setVencimento(e.value ?? null)}
                dateFormat="dd/mm/yy"
                showIcon
                disabled={!contexto}
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
          </div>

          {contexto && valorNominal != null ? (
            <p className="text-sm text-white/40">
              Total a registrar:{" "}
              <span className="font-semibold text-emerald-300/90">{formatMoney(valorNominal)}</span>
            </p>
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
          disabled={saving || !podeEmitir || contextoLoading}
          onClick={() => void emitir()}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
        >
          {saving ? "A emitir…" : "Emitir boleto avulso"}
        </button>
      </div>
    </div>
  );
}
