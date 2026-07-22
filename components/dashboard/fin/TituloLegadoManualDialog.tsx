"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { DashboardCalendar } from "@/lib/dashboard-calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { toast } from "sonner";
import {
  finService,
  formatContratoRef,
  type TituloCobranca,
  type TituloContextoLote,
  type TituloLegadoManualCreate,
  type TituloLegadoManualStatus,
  type TituloLegadoManualUpdate,
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

const STATUS_LEGADO_OPTIONS: { label: string; value: TituloLegadoManualStatus }[] = [
  { label: "Emitido (aberto)", value: "EMITIDO" },
  { label: "Registrado", value: "REGISTRADO" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

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

type TituloLegadoManualDialogProps = {
  visible: boolean;
  onHide: () => void;
  onCreated?: (titulo?: TituloCobranca) => void;
  /** Modo edição: apenas títulos com `legado=true`. */
  tituloId?: string | null;
};

export function TituloLegadoManualDialog({
  visible,
  onHide,
  onCreated,
  tituloId = null,
}: TituloLegadoManualDialogProps) {
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
  const [contexto, setContexto] = useState<TituloContextoLote | null>(null);
  const [contextoLoading, setContextoLoading] = useState(false);
  const [numeroParcela, setNumeroParcela] = useState<number | null>(null);
  const [valorNominal, setValorNominal] = useState<number | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [statusFinal, setStatusFinal] = useState<TituloLegadoManualStatus>("EMITIDO");
  const [nossoNumero, setNossoNumero] = useState("");
  const [linhaDigitavel, setLinhaDigitavel] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [idExternoBanco, setIdExternoBanco] = useState("");
  const [urlBoleto, setUrlBoleto] = useState("");
  const [boletoModo, setBoletoModo] = useState<"url" | "arquivo">("url");
  const [arquivoBoleto, setArquivoBoleto] = useState<File | null>(null);
  const [temArquivoBoleto, setTemArquivoBoleto] = useState(false);
  const [removerArquivoBoleto, setRemoverArquivoBoleto] = useState(false);
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [valorJuros, setValorJuros] = useState<number | null>(null);
  const [valorMulta, setValorMulta] = useState<number | null>(null);
  const [valorDesconto, setValorDesconto] = useState<number | null>(null);
  const [valorTarifa, setValorTarifa] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  const resetForm = useCallback(() => {
    setTituloEdicao(null);
    setSelectedEmpreendimento(null);
    setSelectedQuadra(null);
    setSelectedLote(null);
    setQuadras([]);
    setLotes([]);
    setContexto(null);
    setNumeroParcela(null);
    setValorNominal(null);
    setVencimento(null);
    setStatusFinal("EMITIDO");
    setNossoNumero("");
    setLinhaDigitavel("");
    setCodigoBarras("");
    setIdExternoBanco("");
    setUrlBoleto("");
    setBoletoModo("url");
    setArquivoBoleto(null);
    setTemArquivoBoleto(false);
    setRemoverArquivoBoleto(false);
    setValorPago(null);
    setDataPagamento(null);
    setValorJuros(null);
    setValorMulta(null);
    setValorDesconto(null);
    setValorTarifa(null);
    setObservacao("");
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
          if (!t.legado) {
            toast.error("Somente títulos legados podem ser editados.");
            onHide();
            return;
          }
          setTituloEdicao(t);
          setNumeroParcela(t.numeroParcela);
          setValorNominal(t.valorNominal);
          setVencimento(parseIsoDate(t.vencimento));
          setStatusFinal(statusLegadoFromTitulo(t.status));
          setNossoNumero(t.nossoNumero ?? "");
          setLinhaDigitavel(t.linhaDigitavel ?? "");
          setCodigoBarras(t.codigoBarras ?? "");
          setIdExternoBanco(t.idExternoBanco ?? "");
          setUrlBoleto(t.urlBoleto ?? "");
          setTemArquivoBoleto(Boolean(t.temArquivoBoleto));
          setRemoverArquivoBoleto(false);
          setArquivoBoleto(null);
          setBoletoModo(t.temArquivoBoleto ? "arquivo" : "url");
          setValorPago(t.valorPago ?? null);
          setDataPagamento(parseDataPagamento(t.dataPagamento));
          setValorJuros(t.valorJuros ?? null);
          setValorMulta(t.valorMulta ?? null);
          setValorTarifa(t.valorTarifa ?? null);
          setObservacao("");
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
      .listQuadrasLegadoManual(selectedEmpreendimento, { skipLoading: true })
      .then(setQuadras)
      .catch(() => toast.error("Falha ao carregar quadras com contrato assinado."))
      .finally(() => setQuadrasLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento]);

  useEffect(() => {
    if (!visible || isEditMode || !selectedQuadra) {
      setLotes([]);
      return;
    }
    setLotesLoading(true);
    finService
      .listLotesLegadoManual(
        { empreendimento: selectedEmpreendimento ?? "", quadra: selectedQuadra },
        { skipLoading: true },
      )
      .then(setLotes)
      .catch(() => toast.error("Falha ao carregar lotes com contrato assinado."))
      .finally(() => setLotesLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento, selectedQuadra]);

  useEffect(() => {
    if (!visible || isEditMode || !selectedQuadra || selectedLote == null) {
      setContexto(null);
      return;
    }
    setContextoLoading(true);
    finService
      .contextoLote(selectedEmpreendimento ?? "", selectedQuadra, selectedLote)
      .then((ctx) => {
        setContexto(ctx);
        setNumeroParcela(ctx.numeroParcela);
        setValorNominal(ctx.valorNominal ?? null);
        setVencimento(parseIsoDate(ctx.vencimentoSugerido));
        if (ctx.avisoValorNominal) {
          toast.warning(ctx.avisoValorNominal);
        }
      })
      .catch((e) => {
        setContexto(null);
        toast.error(e instanceof Error ? e.message : "Lote sem contrato ativo para cobrança.");
      })
      .finally(() => setContextoLoading(false));
  }, [visible, isEditMode, selectedEmpreendimento, selectedQuadra, selectedLote]);

  useEffect(() => {
    if (statusFinal === "PAGO" && valorPago == null && valorNominal != null) {
      setValorPago(valorNominal);
    }
  }, [statusFinal, valorPago, valorNominal]);

  const podeSalvar =
    (isEditMode ? tituloEdicao != null : contexto != null) &&
    numeroParcela != null &&
    numeroParcela > 0 &&
    valorNominal != null &&
    valorNominal > 0 &&
    vencimento != null &&
    (isEditMode || !contexto?.avisoConvenio) &&
    (statusFinal !== "PAGO" || (valorPago != null && valorPago > 0 && dataPagamento != null));

  const buildPayloadBase = (): TituloLegadoManualUpdate => {
    const body: TituloLegadoManualUpdate = {
      numeroParcela: numeroParcela!,
      valorNominal: valorNominal!,
      vencimento: formatIsoDate(vencimento!),
      statusFinal,
      nossoNumero: nossoNumero.trim() || undefined,
      linhaDigitavel: linhaDigitavel.trim() || undefined,
      codigoBarras: codigoBarras.trim() || undefined,
      idExternoBanco: idExternoBanco.trim() || undefined,
      urlBoleto:
        boletoModo === "url" ? urlBoleto.trim() || undefined : undefined,
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

  async function sincronizarArquivoBoleto(tituloSalvo: TituloCobranca): Promise<TituloCobranca> {
    if (boletoModo === "arquivo") {
      if (arquivoBoleto) {
        return finService.uploadBoletoArquivo(tituloSalvo.id, arquivoBoleto);
      }
      if (removerArquivoBoleto && temArquivoBoleto) {
        return finService.removerBoletoArquivo(tituloSalvo.id);
      }
    }
    return tituloSalvo;
  }

  const salvar = async () => {
    if (!vencimento || numeroParcela == null || valorNominal == null) {
      toast.error("Preencha parcela, valor e vencimento.");
      return;
    }
    if (!isEditMode && contexto?.avisoConvenio) {
      toast.error(contexto.avisoConvenio);
      return;
    }
    if (boletoModo === "arquivo" && arquivoBoleto && !arquivoBoleto.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && tituloId) {
        let atualizado = await finService.atualizarTituloLegadoManual(tituloId, buildPayloadBase());
        atualizado = await sincronizarArquivoBoleto(atualizado);
        toast.success(`Título legado atualizado (parcela ${atualizado.numeroParcela}, ${atualizado.status}).`);
        handleHide();
        onCreated?.(atualizado);
        return;
      }
      if (!contexto) {
        toast.error("Selecione o lote do contrato.");
        return;
      }
      const body: TituloLegadoManualCreate = {
        ...buildPayloadBase(),
        contratoId: contexto.contratoId,
      };
      let criado = await finService.criarTituloLegadoManual(body);
      criado = await sincronizarArquivoBoleto(criado);
      toast.success(`Título legado criado (parcela ${criado.numeroParcela}, ${criado.status}).`);
      handleHide();
      onCreated?.(criado);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar título legado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardDialog
      header={isEditMode ? "Editar título legado" : "Lançamento manual legado"}
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
            disabled={saving || !podeSalvar || contextoLoading || tituloEdicaoLoading}
            onClick={() => void salvar()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving
              ? isEditMode
                ? "A guardar…"
                : "A lançar…"
              : isEditMode
                ? "Guardar alterações"
                : "Lançar título"}
          </button>
        </div>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-white/45">
        {isEditMode
          ? "Altere dados históricos importados ou lançados manualmente. Títulos emitidos pelo sistema não podem ser editados aqui."
          : "Importa títulos históricos já emitidos ou quitados, sem registro no banco. O vencimento pode ser retroativo. Para parcelas já pagas, escolha status Pago e informe valor e data do pagamento."}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {isEditMode && tituloEdicao ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/90 sm:col-span-2">
            Contrato{" "}
            <span className="font-mono font-semibold text-white">
              {formatContratoRef(tituloEdicao.numeroContrato, tituloEdicao.contratoId)}
            </span>
            {" · "}
            Convênio: {tituloEdicao.convenioNome}
            {tituloEdicaoLoading ? " — a carregar…" : null}
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
            placeholder="Selecione o empreendimento"
            className="w-full"
            filter
            disabled={empreendimentosLoading}
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
            placeholder={selectedEmpreendimento ? "Quadra" : "Empreendimento primeiro"}
            className="w-full"
            filter
            disabled={!selectedEmpreendimento || quadrasLoading}
            pt={DROPDOWN_PT}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Lote</label>
          <Dropdown
            value={selectedLote}
            options={lotes.map((n) => ({ label: `Lote ${n}`, value: n }))}
            onChange={(e) => setSelectedLote(e.value ?? null)}
            placeholder={selectedQuadra ? "Lote" : "Quadra primeiro"}
            className="w-full"
            disabled={!selectedQuadra || lotesLoading}
            pt={DROPDOWN_PT}
          />
        </div>

        {contexto ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/90 sm:col-span-2">
            Contrato{" "}
            <span className="font-mono font-semibold text-white">
              {formatContratoRef(contexto.numeroContrato, contexto.contratoId)}
            </span>
            {contextoLoading ? " — a carregar…" : null}
          </div>
        ) : null}

        {contexto?.avisoValorNominal ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90 sm:col-span-2">
            {contexto.avisoValorNominal} Informe o valor nominal manualmente.
          </div>
        ) : null}
          </>
        )}

        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Parcela</label>
          <InputNumber
            value={numeroParcela}
            onValueChange={(e) => setNumeroParcela(e.value ?? null)}
            min={1}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
            disabled={!isEditMode && !contexto}
          />
        </div>
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
            disabled={!isEditMode && !contexto}
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
            disabled={!isEditMode && !contexto}
          />
        </div>
        {!isEditMode ? (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={FORM_LABEL_CLASS}>Convênio (empreendimento)</label>
          {contexto?.avisoConvenio ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              {contexto.avisoConvenio}
            </p>
          ) : (
            <p className="text-sm font-medium text-white/80">{contexto?.convenioNome ?? "—"}</p>
          )}
        </div>
        ) : null}
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
            placeholder="UUID Unicred, etc."
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={FORM_LABEL_CLASS}>Linha digitável</label>
          <InputText
            value={linhaDigitavel}
            onChange={(e) => setLinhaDigitavel(e.target.value)}
            className={FORM_INPUT_CLASS}
            placeholder="Opcional"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={FORM_LABEL_CLASS}>Código de barras</label>
          <InputText
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            className={FORM_INPUT_CLASS}
            placeholder="Opcional"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className={FORM_LABEL_CLASS}>Boleto</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setBoletoModo("url");
                setArquivoBoleto(null);
                setRemoverArquivoBoleto(false);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                boletoModo === "url"
                  ? "bg-amber-600 text-white"
                  : "border border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => {
                setBoletoModo("arquivo");
                setUrlBoleto("");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                boletoModo === "arquivo"
                  ? "bg-amber-600 text-white"
                  : "border border-white/10 bg-white/[0.04] text-white/55 hover:text-white"
              }`}
            >
              Arquivo PDF
            </button>
          </div>
          {boletoModo === "url" ? (
            <InputText
              value={urlBoleto}
              onChange={(e) => setUrlBoleto(e.target.value)}
              className={FORM_INPUT_CLASS}
              placeholder="https://…"
            />
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {temArquivoBoleto && !removerArquivoBoleto && !arquivoBoleto ? (
                <div className="flex items-center justify-between gap-2 text-sm text-emerald-200/90">
                  <span>PDF anexado</span>
                  <button
                    type="button"
                    className="text-xs font-bold uppercase tracking-wider text-rose-300/90 hover:text-rose-200"
                    onClick={() => setRemoverArquivoBoleto(true)}
                  >
                    Remover
                  </button>
                </div>
              ) : null}
              {removerArquivoBoleto && !arquivoBoleto ? (
                <p className="text-xs text-amber-200/80">
                  O PDF anexado será removido ao guardar. Escolha outro ficheiro para substituir.
                </p>
              ) : null}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-white"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setArquivoBoleto(f);
                  if (f) setRemoverArquivoBoleto(false);
                }}
              />
              {arquivoBoleto ? (
                <span className="truncate text-xs text-white/50">{arquivoBoleto.name}</span>
              ) : null}
            </div>
          )}
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
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Desconto (R$)</label>
              <InputNumber
                value={valorDesconto}
                onValueChange={(e) => setValorDesconto(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Tarifa (R$)</label>
              <InputNumber
                value={valorTarifa}
                onValueChange={(e) => setValorTarifa(e.value ?? null)}
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
