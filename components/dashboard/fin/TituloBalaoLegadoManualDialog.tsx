"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { TituloBalaoCorrecaoDetalhe } from "@/components/dashboard/fin/TituloBalaoCorrecaoDetalhe";
import { DashboardCalendar } from "@/lib/dashboard-calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { toast } from "sonner";
import {
  finService,
  formatContratoRef,
  formatTituloParcelaLabel,
  type ContratoBalaoPendenteItem,
  type TituloBalaoLegadoManualCreate,
  type TituloBalaoLegadoManualUpdate,
  type TituloCobranca,
  type TituloLegadoManualStatus,
} from "@/lib/fin-service";
import { parseIsoDate, formatIsoDate } from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
};

const CALENDAR_INPUT_CLASS = `${FORM_INPUT_CLASS} rounded-r-none`;

const STATUS_LEGADO_OPTIONS: { label: string; value: TituloLegadoManualStatus }[] = [
  { label: "Emitido (aberto)", value: "EMITIDO" },
  { label: "Registrado", value: "REGISTRADO" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

function calendarValueFromDate(date: Date | null): Date | null {
  if (!date) return null;
  return new Date(`${formatIsoDate(date)}T00:00:00`);
}

function onCalendarDateChange(
  value: Date | Date[] | null | undefined,
  setter: (date: Date | null) => void,
) {
  if (value instanceof Date) {
    const d = value;
    setter(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    return;
  }
  setter(null);
}

function statusLegadoFromTitulo(status: string): TituloLegadoManualStatus {
  if (STATUS_LEGADO_OPTIONS.some((o) => o.value === status)) {
    return status as TituloLegadoManualStatus;
  }
  return "EMITIDO";
}

function parseDataPagamento(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return parseIsoDate(iso.slice(0, 10));
}

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  visible: boolean;
  onHide: () => void;
  onCreated?: (titulo?: TituloCobranca) => void;
  tituloId?: string | null;
};

export function TituloBalaoLegadoManualDialog({
  visible,
  onHide,
  onCreated,
  tituloId = null,
}: Props) {
  const isEditMode = Boolean(tituloId);
  const [saving, setSaving] = useState(false);
  const [tituloEdicao, setTituloEdicao] = useState<TituloCobranca | null>(null);
  const [tituloEdicaoLoading, setTituloEdicaoLoading] = useState(false);

  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(false);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string | null>(null);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [selectedQuadra, setSelectedQuadra] = useState<string | null>(null);
  const [lotes, setLotes] = useState<number[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [selectedLote, setSelectedLote] = useState<number | null>(null);
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [numeroContrato, setNumeroContrato] = useState<string | null>(null);
  const [contextoLoading, setContextoLoading] = useState(false);

  const [baloes, setBaloes] = useState<ContratoBalaoPendenteItem[]>([]);
  const [baloesLoading, setBaloesLoading] = useState(false);
  const [numeroBalao, setNumeroBalao] = useState<number | null>(null);
  const [parcelaReferencia, setParcelaReferencia] = useState<number | null>(null);

  const [valorNominal, setValorNominal] = useState<number | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [statusFinal, setStatusFinal] = useState<TituloLegadoManualStatus>("EMITIDO");
  const [nossoNumero, setNossoNumero] = useState("");
  const [linhaDigitavel, setLinhaDigitavel] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [idExternoBanco, setIdExternoBanco] = useState("");
  const [urlBoleto, setUrlBoleto] = useState("");
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [valorJuros, setValorJuros] = useState<number | null>(null);
  const [valorMulta, setValorMulta] = useState<number | null>(null);
  const [valorDesconto, setValorDesconto] = useState<number | null>(null);
  const [valorTarifa, setValorTarifa] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");
  const [correcaoPreview, setCorrecaoPreview] = useState<
    Awaited<ReturnType<typeof finService.simularTituloBalao>>["correcao"] | null
  >(null);

  const balaoOptions = useMemo(
    () =>
      baloes.map((b) => ({
        label: `B${b.numeroBalao} · ${formatMoney(b.valorNominal)} · ref. P${b.parcelaReferencia}${
          b.jaEmitido ? " (já emitido)" : ""
        }`,
        value: b.numeroBalao,
        disabled: b.jaEmitido,
      })),
    [baloes],
  );

  const resetForm = useCallback(() => {
    setTituloEdicao(null);
    setSelectedEmpreendimento(null);
    setSelectedQuadra(null);
    setSelectedLote(null);
    setQuadras([]);
    setLotes([]);
    setContratoId(null);
    setNumeroContrato(null);
    setBaloes([]);
    setNumeroBalao(null);
    setParcelaReferencia(null);
    setValorNominal(null);
    setVencimento(null);
    setStatusFinal("EMITIDO");
    setNossoNumero("");
    setLinhaDigitavel("");
    setCodigoBarras("");
    setIdExternoBanco("");
    setUrlBoleto("");
    setValorPago(null);
    setDataPagamento(null);
    setValorJuros(null);
    setValorMulta(null);
    setValorDesconto(null);
    setValorTarifa(null);
    setObservacao("");
    setCorrecaoPreview(null);
  }, []);

  const handleHide = useCallback(() => {
    resetForm();
    onHide();
  }, [onHide, resetForm]);

  useEffect(() => {
    if (!visible) return;
    if (isEditMode && tituloId) {
      setTituloEdicaoLoading(true);
      finService
        .getTitulo(tituloId)
        .then((t) => {
          if (!t.legado || t.tipoParcela !== "BALAO") {
            toast.error("Somente títulos de balão legados podem ser editados aqui.");
            onHide();
            return;
          }
          setTituloEdicao(t);
          setNumeroBalao(t.numeroBalao ?? null);
          setParcelaReferencia(t.numeroParcela);
          setValorNominal(t.valorNominal);
          setVencimento(parseIsoDate(t.vencimento));
          setStatusFinal(statusLegadoFromTitulo(t.status));
          setNossoNumero(t.nossoNumero ?? "");
          setLinhaDigitavel(t.linhaDigitavel ?? "");
          setCodigoBarras(t.codigoBarras ?? "");
          setIdExternoBanco(t.idExternoBanco ?? "");
          setUrlBoleto(t.urlBoleto ?? "");
          setValorPago(t.valorPago ?? null);
          setDataPagamento(parseDataPagamento(t.dataPagamento));
          setValorJuros(t.valorJuros ?? null);
          setValorMulta(t.valorMulta ?? null);
          setValorTarifa(t.valorTarifa ?? null);
        })
        .catch(() => toast.error("Falha ao carregar título legado."))
        .finally(() => setTituloEdicaoLoading(false));
      return;
    }
    setEmpreendimentosLoading(true);
    finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch(() => toast.error("Falha ao carregar empreendimentos."))
      .finally(() => setEmpreendimentosLoading(false));
  }, [visible, isEditMode, tituloId, onHide]);

  useEffect(() => {
    if (!visible || isEditMode || !selectedEmpreendimento) {
      setQuadras([]);
      return;
    }
    setQuadrasLoading(true);
    finService
      .listQuadrasImovel({ empreendimento: selectedEmpreendimento }, { skipLoading: true })
      .then(setQuadras)
      .catch(() => toast.error("Falha ao carregar quadras."))
      .finally(() => setQuadrasLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento]);

  useEffect(() => {
    if (!visible || isEditMode || !selectedQuadra) {
      setLotes([]);
      return;
    }
    setLotesLoading(true);
    finService
      .listLotesImovel(
        { empreendimento: selectedEmpreendimento ?? "", quadra: selectedQuadra },
        { skipLoading: true },
      )
      .then(setLotes)
      .catch(() => toast.error("Falha ao carregar lotes."))
      .finally(() => setLotesLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento, selectedQuadra]);

  useEffect(() => {
    if (!visible || isEditMode || !selectedQuadra || selectedLote == null) {
      setContratoId(null);
      setBaloes([]);
      return;
    }
    setContextoLoading(true);
    finService
      .contextoLote(selectedEmpreendimento ?? "", selectedQuadra, selectedLote)
      .then((ctx) => {
        setContratoId(ctx.contratoId);
        setNumeroContrato(ctx.numeroContrato);
        if (ctx.avisoConvenio) {
          toast.warning(ctx.avisoConvenio);
        }
      })
      .catch(() => {
        setContratoId(null);
        toast.error("Lote sem contrato ativo.");
      })
      .finally(() => setContextoLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento, selectedQuadra, selectedLote]);

  useEffect(() => {
    if (!visible || isEditMode || contratoId == null) {
      setBaloes([]);
      setNumeroBalao(null);
      return;
    }
    setBaloesLoading(true);
    finService
      .listBaloesPendentes(contratoId)
      .then((items) => {
        setBaloes(items);
        const primeiro = items.find((b) => !b.jaEmitido);
        setNumeroBalao(primeiro?.numeroBalao ?? null);
      })
      .catch(() => toast.error("Falha ao carregar balões do contrato."))
      .finally(() => setBaloesLoading(false));
  }, [visible, isEditMode, contratoId]);

  useEffect(() => {
    if (!visible || isEditMode || contratoId == null || numeroBalao == null) {
      setCorrecaoPreview(null);
      return;
    }
    finService
      .simularTituloBalao(contratoId, numeroBalao)
      .then((preview) => {
        setValorNominal(preview.valorNominal);
        setVencimento(parseIsoDate(preview.vencimento));
        setParcelaReferencia(preview.parcelaReferencia);
        setCorrecaoPreview(preview.correcao ?? null);
      })
      .catch(() => {
        setCorrecaoPreview(null);
        toast.error("Falha ao simular valor do balão.");
      });
  }, [visible, isEditMode, contratoId, numeroBalao]);

  useEffect(() => {
    if (statusFinal === "PAGO" && valorPago == null && valorNominal != null) {
      setValorPago(valorNominal);
    }
  }, [statusFinal, valorPago, valorNominal]);

  const podeSalvar =
    (isEditMode ? tituloEdicao != null : contratoId != null && numeroBalao != null) &&
    valorNominal != null &&
    valorNominal > 0 &&
    vencimento != null &&
    (statusFinal !== "PAGO" || (valorPago != null && valorPago > 0 && dataPagamento != null));

  const buildPayloadBase = (): TituloBalaoLegadoManualUpdate => {
    const body: TituloBalaoLegadoManualUpdate = {
      valorNominal: valorNominal!,
      vencimento: formatIsoDate(vencimento!),
      statusFinal,
      nossoNumero: nossoNumero.trim() || undefined,
      linhaDigitavel: linhaDigitavel.trim() || undefined,
      codigoBarras: codigoBarras.trim() || undefined,
      idExternoBanco: idExternoBanco.trim() || undefined,
      urlBoleto: urlBoleto.trim() || undefined,
      observacao: observacao.trim() || undefined,
    };
    if (statusFinal === "PAGO" && valorPago != null && dataPagamento) {
      body.valorPago = valorPago;
      body.dataPagamento = formatIsoDate(dataPagamento);
      if (valorJuros != null) body.valorJuros = valorJuros;
      if (valorMulta != null) body.valorMulta = valorMulta;
      if (valorDesconto != null) body.valorDesconto = valorDesconto;
      if (valorTarifa != null) body.valorTarifa = valorTarifa;
    }
    return body;
  };

  const salvar = async () => {
    if (!vencimento || valorNominal == null) {
      toast.error("Preencha valor e vencimento.");
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && tituloId) {
        const atualizado = await finService.atualizarTituloBalaoLegadoManual(
          tituloId,
          buildPayloadBase(),
        );
        toast.success(
          `Título legado ${formatTituloParcelaLabel(atualizado)} atualizado (${atualizado.status}).`,
        );
        handleHide();
        onCreated?.(atualizado);
        return;
      }
      if (contratoId == null || numeroBalao == null) {
        toast.error("Selecione contrato e balão.");
        return;
      }
      const body: TituloBalaoLegadoManualCreate = {
        ...buildPayloadBase(),
        contratoId,
        numeroBalao,
      };
      const criado = await finService.criarTituloBalaoLegadoManual(body);
      toast.success(
        `Título legado ${formatTituloParcelaLabel(criado)} criado (${criado.status}).`,
      );
      handleHide();
      onCreated?.(criado);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar título legado de balão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardDialog
      header={isEditMode ? "Editar balão legado" : "Lançamento manual — balão legado"}
      visible={visible}
      onHide={handleHide}
      className="w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl"
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleHide}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !podeSalvar || contextoLoading || baloesLoading || tituloEdicaoLoading}
            onClick={() => void salvar()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "A guardar…" : isEditMode ? "Guardar alterações" : "Lançar balão legado"}
          </button>
        </div>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-white/45">
        Importa balões históricos sem registro na Unicred. Datas e situação são editáveis. Status{" "}
        <strong className="font-medium text-white/70">Pago</strong> gera contabilidade; cancelamento
        posterior estorna a emissão quando aplicável.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {isEditMode && tituloEdicao ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/90 sm:col-span-2">
            {formatTituloParcelaLabel(tituloEdicao)} · contrato{" "}
            <span className="font-mono font-semibold text-white">
              {formatContratoRef(tituloEdicao.numeroContrato, tituloEdicao.contratoId)}
            </span>
            {parcelaReferencia != null ? ` · ref. parcela ${parcelaReferencia}` : null}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={FORM_LABEL_CLASS}>Empreendimento</label>
              <Dropdown
                value={selectedEmpreendimento}
                options={empreendimentos.map((emp) => ({ label: emp, value: emp }))}
                onChange={(e) => {
                  setSelectedEmpreendimento(e.value ?? null);
                  setSelectedQuadra(null);
                  setSelectedLote(null);
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
                options={lotes.map((n) => ({ label: String(n), value: n }))}
                onChange={(e) => setSelectedLote(e.value ?? null)}
                placeholder="Lote"
                disabled={!selectedQuadra || lotesLoading}
                className="w-full"
                pt={DROPDOWN_PT}
              />
            </div>
            {contratoId ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/90 sm:col-span-2">
                Contrato{" "}
                <span className="font-mono font-semibold text-white">
                  {formatContratoRef(numeroContrato, contratoId)}
                </span>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={FORM_LABEL_CLASS}>Balão</label>
              <Dropdown
                value={numeroBalao}
                options={balaoOptions}
                optionLabel="label"
                optionValue="value"
                optionDisabled="disabled"
                onChange={(e) => setNumeroBalao((e.value as number | null) ?? null)}
                placeholder={baloes.length === 0 ? "Nenhum balão configurado" : "Selecione"}
                disabled={!contratoId || baloesLoading}
                className="w-full"
                pt={DROPDOWN_PT}
              />
            </div>
          </>
        )}

        {!isEditMode && correcaoPreview ? (
          <div className="sm:col-span-2">
            <TituloBalaoCorrecaoDetalhe correcao={correcaoPreview} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Valor nominal (R$)</label>
          <InputNumber
            value={valorNominal}
            onValueChange={(e) => setValorNominal(e.value ?? null)}
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            minFractionDigits={2}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
            disabled={!isEditMode && !contratoId}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Vencimento</label>
          <DashboardCalendar
            value={calendarValueFromDate(vencimento)}
            onChange={(e) => onCalendarDateChange(e.value, setVencimento)}
            placeholder="00/00/0000"
            mask="99/99/9999"
            className="w-full"
            inputClassName={CALENDAR_INPUT_CLASS}
            disabled={!isEditMode && !contratoId}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={FORM_LABEL_CLASS}>Status final</label>
          <Dropdown
            value={statusFinal}
            options={STATUS_LEGADO_OPTIONS}
            onChange={(e) => setStatusFinal((e.value as TituloLegadoManualStatus) ?? "EMITIDO")}
            className="w-full"
            pt={DROPDOWN_PT}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Nosso número</label>
          <InputText
            value={nossoNumero}
            onChange={(e) => setNossoNumero(e.target.value)}
            maxLength={20}
            className={FORM_INPUT_CLASS}
            placeholder="Opcional"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>ID externo banco</label>
          <InputText
            value={idExternoBanco}
            onChange={(e) => setIdExternoBanco(e.target.value)}
            maxLength={64}
            className={FORM_INPUT_CLASS}
            placeholder="Opcional"
          />
        </div>

        {statusFinal === "PAGO" ? (
          <>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Valor pago (R$)</label>
              <InputNumber
                value={valorPago}
                onValueChange={(e) => setValorPago(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                minFractionDigits={2}
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Data pagamento</label>
              <DashboardCalendar
                value={calendarValueFromDate(dataPagamento)}
                onChange={(e) => onCalendarDateChange(e.value, setDataPagamento)}
                placeholder="00/00/0000"
                mask="99/99/9999"
                className="w-full"
                inputClassName={CALENDAR_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Juros (R$)</label>
              <InputNumber
                value={valorJuros}
                onValueChange={(e) => setValorJuros(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Multa (R$)</label>
              <InputNumber
                value={valorMulta}
                onValueChange={(e) => setValorMulta(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={FORM_LABEL_CLASS}>Observação (histórico)</label>
          <InputText
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className={FORM_INPUT_CLASS}
            placeholder="Ex.: importado do sistema anterior"
          />
        </div>
      </div>
    </DashboardDialog>
  );
}
