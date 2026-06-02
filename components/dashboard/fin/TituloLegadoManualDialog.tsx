"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { toast } from "sonner";
import {
  finService,
  formatContratoRef,
  type TituloContextoLote,
  type TituloLegadoManualCreate,
  type TituloLegadoManualStatus,
} from "@/lib/fin-service";
import { parseIsoDate } from "@/lib/fin-vencimento";

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

const STATUS_LEGADO_OPTIONS: { label: string; value: TituloLegadoManualStatus }[] = [
  { label: "Emitido (aberto)", value: "EMITIDO" },
  { label: "Registrado", value: "REGISTRADO" },
  { label: "Pago", value: "PAGO" },
  { label: "Vencido", value: "VENCIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type TituloLegadoManualDialogProps = {
  visible: boolean;
  onHide: () => void;
  onCreated?: () => void;
};

export function TituloLegadoManualDialog({
  visible,
  onHide,
  onCreated,
}: TituloLegadoManualDialogProps) {
  const [saving, setSaving] = useState(false);
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
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(null);
  const [valorJuros, setValorJuros] = useState<number | null>(null);
  const [valorMulta, setValorMulta] = useState<number | null>(null);
  const [valorDesconto, setValorDesconto] = useState<number | null>(null);
  const [valorTarifa, setValorTarifa] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  const resetForm = useCallback(() => {
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
    setEmpreendimentosLoading(true);
    finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch(() => toast.error("Falha ao carregar empreendimentos."))
      .finally(() => setEmpreendimentosLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible || !selectedEmpreendimento) {
      setQuadras([]);
      return;
    }
    setQuadrasLoading(true);
    finService
      .listQuadrasImovel({ empreendimento: selectedEmpreendimento }, { skipLoading: true })
      .then(setQuadras)
      .catch(() => toast.error("Falha ao carregar quadras."))
      .finally(() => setQuadrasLoading(false));
  }, [visible, selectedEmpreendimento]);

  useEffect(() => {
    if (!visible || !selectedQuadra) {
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
  }, [visible, selectedEmpreendimento, selectedQuadra]);

  useEffect(() => {
    if (!visible || !selectedQuadra || selectedLote == null) {
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
  }, [visible, selectedEmpreendimento, selectedQuadra, selectedLote]);

  useEffect(() => {
    if (statusFinal === "PAGO" && valorPago == null && valorNominal != null) {
      setValorPago(valorNominal);
    }
  }, [statusFinal, valorPago, valorNominal]);

  const podeSalvar =
    contexto != null &&
    numeroParcela != null &&
    numeroParcela > 0 &&
    valorNominal != null &&
    valorNominal > 0 &&
    vencimento != null &&
    !contexto?.avisoConvenio &&
    (statusFinal !== "PAGO" || (valorPago != null && valorPago > 0 && dataPagamento != null));

  const salvar = async () => {
    if (!contexto || !vencimento || numeroParcela == null || valorNominal == null) {
      toast.error("Preencha contrato, parcela, valor e vencimento.");
      return;
    }
    if (contexto.avisoConvenio) {
      toast.error(contexto.avisoConvenio);
      return;
    }
    setSaving(true);
    try {
      const body: TituloLegadoManualCreate = {
        contratoId: contexto.contratoId,
        numeroParcela,
        valorNominal,
        vencimento: formatDateIso(vencimento),
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
        body.dataPagamento = formatDateIso(dataPagamento);
        if (valorJuros != null) body.valorJuros = valorJuros;
        if (valorMulta != null) body.valorMulta = valorMulta;
        if (valorDesconto != null) body.valorDesconto = valorDesconto;
        if (valorTarifa != null) body.valorTarifa = valorTarifa;
      }
      const criado = await finService.criarTituloLegadoManual(body);
      toast.success(`Título legado criado (parcela ${criado.numeroParcela}, ${criado.status}).`);
      handleHide();
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao lançar título legado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardDialog
      header="Lançamento manual legado"
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
            disabled={saving || !podeSalvar || contextoLoading}
            onClick={() => void salvar()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "A lançar…" : "Lançar título"}
          </button>
        </div>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-white/45">
        Importa títulos históricos já emitidos ou quitados, sem registro no banco. O vencimento pode ser
        retroativo. Para parcelas já pagas, escolha status Pago e informe valor e data do pagamento.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
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

        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Parcela</label>
          <InputNumber
            value={numeroParcela}
            onValueChange={(e) => setNumeroParcela(e.value ?? null)}
            min={1}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
            disabled={!contexto}
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
            disabled={!contexto}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Vencimento</label>
          <Calendar
            value={vencimento}
            onChange={(e) => setVencimento(e.value as Date | null)}
            dateFormat="dd/mm/yy"
            showIcon
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
            disabled={!contexto}
          />
        </div>
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
          <label className={FORM_LABEL_CLASS}>URL do boleto</label>
          <InputText
            value={urlBoleto}
            onChange={(e) => setUrlBoleto(e.target.value)}
            className={FORM_INPUT_CLASS}
            placeholder="https://…"
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
              <Calendar
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.value as Date | null)}
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                inputClassName={FORM_INPUT_CLASS}
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
