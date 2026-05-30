"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Play, Save, Send } from "lucide-react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { toast } from "sonner";
import {
  ADITIVO_WIZARD_STEPS,
  AditivoWorkflowStepper,
} from "@/components/dashboard/aditivo-form/AditivoWorkflowStepper";
import {
  ADITIVO_DROPDOWN_PT,
  ADITIVO_HINT_CLASS,
  ADITIVO_INPUT_CLASS,
  ADITIVO_LABEL_CLASS,
} from "@/components/dashboard/aditivo-form/constants";
import { FormSection } from "@/components/dashboard/cliente-form/FormSection";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import { apiFetch } from "@/lib/api-fetch";
import { getContratoHonorariosByIdUrl } from "@/lib/api-config";
import {
  aprovarReducaoCondicoes,
  criarCondicoesRascunho,
  publicarCondicoesVersao,
  simularCondicoesVersao,
  uploadAditivoPdf,
  type CondicoesVersaoSimulacaoResponse,
  type PoliticaReajustePosTransicao,
  type TipoOrigemCondicoesVersao,
} from "@/lib/contrato-condicoes-service";
import { isAdmin } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  condicoesToApiPayload,
  contratoResponseToFormValues,
  type ContratoHonorariosApiResponse,
  type ContratoHonorariosFormValues,
} from "@/lib/validations/contrato-honorarios";

type Props = {
  contratoId: number;
};

const LAST_STEP = ADITIVO_WIZARD_STEPS.length - 1;

const TIPO_OPTIONS: { label: string; value: TipoOrigemCondicoesVersao; hint: string }[] = [
  {
    label: "Aditivo de grade (A)",
    value: "ADITIVO_GRADE",
    hint: "Alteração completa das condições financeiras — apenas administrador.",
  },
  {
    label: "Renegociação de saldo (B)",
    value: "RENEGOCIACAO_SALDO",
    hint: "Novo saldo/parcelas após negociação com o cliente.",
  },
  {
    label: "Ajuste de agenda (C)",
    value: "AJUSTE_AGENDA",
    hint: "Data da 1ª parcela, dia de vencimento e observações — sem PDF.",
  },
];

const POLITICA_OPTIONS: { label: string; value: PoliticaReajustePosTransicao }[] = [
  { label: "Manter cadeia IPCA", value: "CADEIA" },
  { label: "Nova base IPCA", value: "NOVA_BASE" },
  { label: "Sem reajuste IPCA", value: "SEM_REAJUSTE" },
];

const TITULO_STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_REGISTRO: "Aguard. registro",
  REGISTRADO: "Registrado",
  EMITIDO: "Emitido",
  VENCIDO: "Vencido",
  ERRO_REGISTRO: "Erro registro",
  EM_CONCILIACAO: "Conciliação",
};

const TABLE_PT_COMPACT = dashboardDataTablePt({ density: "compact", paginator: false });

const STEP_MOTION = {
  initial: { opacity: 0, y: 10, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(10px)" },
  transition: { duration: 0.4, ease: "circOut" as const },
};

function formatBrl(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <p className="mt-2 font-mono text-lg font-semibold text-white md:text-xl">{value}</p>
    </div>
  );
}

function CondicoesFields({
  values,
  onChange,
  agendaOnly,
}: {
  values: ContratoHonorariosFormValues;
  onChange: (patch: Partial<ContratoHonorariosFormValues>) => void;
  agendaOnly: boolean;
}) {
  const field = (key: keyof ContratoHonorariosFormValues, label: string, type: "text" | "date" = "text") => (
    <div>
      <label className={ADITIVO_LABEL_CLASS}>{label}</label>
      <InputText
        type={type}
        value={values[key] as string}
        onChange={(e) => onChange({ [key]: e.target.value } as Partial<ContratoHonorariosFormValues>)}
        className={ADITIVO_INPUT_CLASS}
      />
    </div>
  );

  if (agendaOnly) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {field("dataPrimeiraParcela", "Data 1ª parcela", "date")}
        {field("diaVencimento", "Dia vencimento")}
        <div className="md:col-span-2">
          <label className={ADITIVO_LABEL_CLASS}>Observações</label>
          <InputTextarea
            value={values.observacoes}
            onChange={(e) => onChange({ observacoes: e.target.value })}
            rows={3}
            className={cn(ADITIVO_INPUT_CLASS, "resize-none")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {field("valorNegociacao", "Valor negociação")}
      {field("valorParcela", "Valor parcela")}
      {field("numParcelasMensais", "Nº parcelas mensais")}
      {field("valorHonorarioEntrada", "Sinal")}
      {field("valorFracionadoVendedora", "Fracionado vendedora")}
      {field("quantidadeParcelasFracionadas", "Qtd. fracionadas")}
      {field("dataPrimeiraParcela", "Data 1ª parcela", "date")}
      {field("diaVencimento", "Dia vencimento")}
      {field("tipoCorrecaoAnual", "Correção anual")}
      {field("percentualCorrecao", "Percentual correção")}
      <div className="md:col-span-2 lg:col-span-3">
        <label className={ADITIVO_LABEL_CLASS}>Observações</label>
        <InputTextarea
          value={values.observacoes}
          onChange={(e) => onChange({ observacoes: e.target.value })}
          rows={2}
          className={cn(ADITIVO_INPUT_CLASS, "resize-none")}
        />
      </div>
    </div>
  );
}

export function ContratoAditivoWizard({ contratoId }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [contrato, setContrato] = useState<ContratoHonorariosApiResponse | null>(null);
  const [form, setForm] = useState<ContratoHonorariosFormValues | null>(null);
  const [tipoOrigem, setTipoOrigem] = useState<TipoOrigemCondicoesVersao>("AJUSTE_AGENDA");
  const [parcelaInicial, setParcelaInicial] = useState<number>(1);
  const [dataVigencia, setDataVigencia] = useState("");
  const [motivo, setMotivo] = useState("");
  const [politicaReajuste, setPoliticaReajuste] = useState<PoliticaReajustePosTransicao>("CADEIA");
  const [simulacao, setSimulacao] = useState<CondicoesVersaoSimulacaoResponse | null>(null);
  const [versaoId, setVersaoId] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const tipoOptions = useMemo(
    () => (isAdmin() ? TIPO_OPTIONS : TIPO_OPTIONS.filter((o) => o.value !== "ADITIVO_GRADE")),
    [],
  );

  const agendaOnly = tipoOrigem === "AJUSTE_AGENDA";
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === LAST_STEP;
  const stepId = ADITIVO_WIZARD_STEPS[currentStep]?.id ?? "config";

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch(getContratoHonorariosByIdUrl(contratoId), { skipLoading: true });
        if (!res.ok) throw new Error("Contrato não encontrado");
        const data: ContratoHonorariosApiResponse = await res.json();
        setContrato(data);
        setForm(contratoResponseToFormValues(data));
        if (data.dataAssinatura) setDataVigencia(data.dataAssinatura.slice(0, 10));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar contrato");
      }
    })();
  }, [contratoId]);

  const buildPayload = useCallback(() => {
    if (!form) return null;
    return {
      tipoOrigem,
      parcelaInicial,
      dataVigencia: dataVigencia || null,
      condicoes: condicoesToApiPayload(form),
      politicaReajuste: agendaOnly ? null : politicaReajuste,
      motivo: motivo.trim() || null,
    };
  }, [form, tipoOrigem, parcelaInicial, dataVigencia, politicaReajuste, motivo, agendaOnly]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const invalidateSimulacao = () => {
    setSimulacao(null);
    setConfirmCancel(false);
  };

  const handleSimular = async () => {
    const body = buildPayload();
    if (!body) return;
    setLoading(true);
    try {
      const result = await simularCondicoesVersao(contratoId, {
        ...body,
        confirmarCancelamentoTitulos: confirmCancel,
      });
      setSimulacao(result);
      setConfirmCancel(false);
      toast.success("Simulação concluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na simulação");
    } finally {
      setLoading(false);
    }
  };

  const salvarRascunho = async (silent = false) => {
    const body = buildPayload();
    if (!body) return null;
    setLoading(true);
    try {
      const v = await criarCondicoesRascunho(contratoId, body);
      setVersaoId(v.id);
      if (!silent) toast.success(`Rascunho v${v.numeroVersao} criado`);
      return v;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar rascunho");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!versaoId || !pdfFile) {
      toast.error("Selecione o PDF e crie o rascunho antes.");
      return;
    }
    setLoading(true);
    try {
      await uploadAditivoPdf(contratoId, versaoId, pdfFile);
      toast.success("PDF anexado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async () => {
    if (!versaoId) return;
    setLoading(true);
    try {
      await aprovarReducaoCondicoes(contratoId, versaoId);
      toast.success("Redução aprovada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na aprovação");
    } finally {
      setLoading(false);
    }
  };

  const handlePublicar = async () => {
    if (!versaoId) {
      toast.error("Crie o rascunho antes de publicar.");
      return;
    }
    if (simulacao && simulacao.titulosAfetados.length > 0 && !confirmCancel) {
      toast.error("Confirme o cancelamento dos títulos listados antes de publicar.");
      return;
    }
    setLoading(true);
    try {
      await publicarCondicoesVersao(
        contratoId,
        versaoId,
        confirmCancel,
        simulacao?.titulosAfetados.map((t) => t.id) ?? [],
      );
      toast.success("Versão publicada");
      router.push("/dashboard/contratos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (isFirstStep) {
      router.push("/dashboard/contratos");
      return;
    }
    setCurrentStep((s) => s - 1);
    scrollTop();
  };

  const handleStepClick = (step: number) => {
    if (step >= currentStep) return;
    setCurrentStep(step);
    scrollTop();
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (parcelaInicial < 1) {
        toast.error("Informe uma parcela inicial válida (≥ 1).");
        return;
      }
      setCurrentStep(1);
      scrollTop();
      return;
    }

    if (currentStep === 1) {
      invalidateSimulacao();
      setCurrentStep(2);
      scrollTop();
      return;
    }

    if (currentStep === 2) {
      if (!simulacao) {
        toast.error("Execute a simulação antes de avançar.");
        return;
      }
      if (simulacao.titulosAfetados.length > 0 && !confirmCancel) {
        toast.error("Confirme o cancelamento dos títulos listados.");
        return;
      }
      if (!versaoId) {
        const v = await salvarRascunho(true);
        if (!v) return;
        toast.success(`Rascunho v${v.numeroVersao} criado`);
      }
      setCurrentStep(3);
      scrollTop();
      return;
    }
  };

  if (!form || !contrato) {
    return (
      <FormSection title="Carregando contrato" description="Aguarde enquanto buscamos os dados do contrato selecionado.">
        <div className="md:col-span-2 py-8 text-center text-sm text-white/40">Carregando…</div>
      </FormSection>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <AditivoWorkflowStepper activeStep={currentStep} onStepClick={handleStepClick} />

      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div key={stepId} {...STEP_MOTION}>
            {stepId === "config" && (
              <div className="space-y-8">
                <FormSection
                  title="Contrato em edição"
                  description="Referência do contrato assinado que receberá a nova versão das condições financeiras."
                  accent="emerald"
                >
                  <div className="md:col-span-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <span className={ADITIVO_LABEL_CLASS}>Número</span>
                      <p className="font-mono text-lg font-semibold text-white">
                        {contrato.numeroContrato ?? `#${contratoId}`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <span className={ADITIVO_LABEL_CLASS}>Cliente</span>
                      <p className="text-sm font-medium text-white/90">{contrato.contratante?.label ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <span className={ADITIVO_LABEL_CLASS}>Status</span>
                      <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Assinado</p>
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  title="Tipo e transição"
                  description="Defina o tipo de aditivo, a parcela a partir da qual a nova grade passa a valer e o motivo da alteração."
                >
                  <div>
                    <label className={ADITIVO_LABEL_CLASS}>Tipo de aditivo</label>
                    <Dropdown
                      value={tipoOrigem}
                      options={tipoOptions}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(e) => {
                        setTipoOrigem(e.value);
                        invalidateSimulacao();
                      }}
                      pt={ADITIVO_DROPDOWN_PT}
                    />
                    <p className={ADITIVO_HINT_CLASS}>{tipoOptions.find((o) => o.value === tipoOrigem)?.hint}</p>
                  </div>

                  <div>
                    <label className={ADITIVO_LABEL_CLASS}>Parcela inicial</label>
                    <InputNumber
                      value={parcelaInicial}
                      onValueChange={(e) => {
                        setParcelaInicial(e.value ?? 1);
                        invalidateSimulacao();
                      }}
                      min={1}
                      className="w-full"
                      inputClassName={ADITIVO_INPUT_CLASS}
                    />
                    <p className={ADITIVO_HINT_CLASS}>
                      Títulos em aberto com parcela ≥ este número serão cancelados na publicação.
                    </p>
                  </div>

                  <div>
                    <label className={ADITIVO_LABEL_CLASS}>Data vigência (informativa)</label>
                    <InputText
                      type="date"
                      value={dataVigencia}
                      onChange={(e) => setDataVigencia(e.target.value)}
                      className={ADITIVO_INPUT_CLASS}
                    />
                  </div>

                  {!agendaOnly && (
                    <div>
                      <label className={ADITIVO_LABEL_CLASS}>IPCA pós-transição</label>
                      <Dropdown
                        value={politicaReajuste}
                        options={POLITICA_OPTIONS}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(e) => {
                          setPoliticaReajuste(e.value);
                          invalidateSimulacao();
                        }}
                        pt={ADITIVO_DROPDOWN_PT}
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className={ADITIVO_LABEL_CLASS}>Motivo</label>
                    <InputTextarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder="Descreva brevemente o motivo comercial ou operacional do aditivo."
                      className={cn(ADITIVO_INPUT_CLASS, "resize-none")}
                    />
                  </div>
                </FormSection>
              </div>
            )}

            {stepId === "condicoes" && (
              <FormSection
                title="Novas condições financeiras"
                description={
                  agendaOnly
                    ? "Ajuste apenas datas e observações da agenda de cobrança."
                    : "Informe os valores e parcelas que passarão a vigorar após a publicação."
                }
                contentClassName="!block"
              >
                <CondicoesFields
                  values={form}
                  onChange={(patch) => {
                    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
                    invalidateSimulacao();
                  }}
                  agendaOnly={agendaOnly}
                />
              </FormSection>
            )}

            {stepId === "simular" && (
              <div className="space-y-8">
                <FormSection
                  title="Simulação de impacto"
                  description="Execute a simulação para visualizar totais, títulos afetados e cronograma futuro."
                  accent={simulacao ? "emerald" : "blue"}
                  contentClassName="!block space-y-6"
                >
                  <Button
                    type="button"
                    label="Simular transição"
                    icon={<Play className="h-4 w-4" />}
                    onClick={() => void handleSimular()}
                    loading={loading}
                    className="rounded-2xl border-none bg-blue-600 px-6 py-3 font-bold shadow-lg shadow-blue-600/20"
                  />

                  {!simulacao && (
                    <p className={ADITIVO_HINT_CLASS}>
                      Clique em simular para calcular o impacto antes de avançar para a publicação.
                    </p>
                  )}

                  {simulacao && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricTile label="Total anterior" value={formatBrl(simulacao.totalAnterior)} />
                        <MetricTile label="Total novo" value={formatBrl(simulacao.totalNovo)} />
                        <MetricTile label="Pago acumulado" value={formatBrl(simulacao.pagoAcumulado)} />
                        <MetricTile label="Saldo devedor" value={formatBrl(simulacao.saldoDevedor)} />
                      </div>

                      {simulacao.diferencaTotal !== 0 && (
                        <p className="text-sm text-white/60">
                          Diferença de total:{" "}
                          <span
                            className={
                              simulacao.reducaoTotal ? "font-semibold text-amber-400" : "font-semibold text-emerald-400"
                            }
                          >
                            {formatBrl(simulacao.diferencaTotal)}
                          </span>
                          {simulacao.reducaoTotal && " · exige aprovação administrativa na publicação"}
                        </p>
                      )}

                      {simulacao.avisos.length > 0 && (
                        <ul className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200/90">
                          {simulacao.avisos.map((a) => (
                            <li key={a} className="flex gap-2">
                              <span className="text-amber-400">•</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </FormSection>

                {simulacao && (
                  <FormSection
                    title="Títulos que serão cancelados"
                    description={`Boletos em aberto a partir da parcela ${parcelaInicial}.`}
                    accent="amber"
                    className="border-amber-500/15"
                    contentClassName="!block space-y-5"
                  >
                    {simulacao.titulosAfetados.length === 0 ? (
                      <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300/90">
                        Nenhum título em aberto a partir da parcela {parcelaInicial}.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
                          <Checkbox
                            inputId="confirm-cancel"
                            checked={confirmCancel}
                            onChange={(e) => setConfirmCancel(!!e.checked)}
                          />
                          <label htmlFor="confirm-cancel" className="cursor-pointer text-sm leading-relaxed text-white/90">
                            Confirmo o cancelamento de{" "}
                            <strong className="text-amber-300">{simulacao.titulosAfetados.length}</strong> título(s)
                            ao publicar.
                          </label>
                        </div>
                        <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
                          <DataTable
                            value={simulacao.titulosAfetados}
                            className={DASHBOARD_DATATABLE_CLASS}
                            pt={TABLE_PT_COMPACT}
                            size="small"
                          >
                            <Column
                              header="Parcela"
                              body={(row) => dashboardCellMono(String(row.numeroParcela))}
                              style={{ width: "5rem" }}
                            />
                            <Column header="Vencimento" body={(row) => dashboardCellText(formatDate(row.vencimento))} />
                            <Column
                              header="Valor nominal"
                              body={(row) => dashboardCellMono(formatBrl(row.valorNominal))}
                            />
                            <Column
                              header="Status"
                              body={(row) =>
                                dashboardStatusBadge(
                                  TITULO_STATUS_LABEL[row.status] ?? row.status,
                                  row.status === "VENCIDO" ? "danger" : "warning",
                                )
                              }
                            />
                          </DataTable>
                        </div>
                      </>
                    )}
                  </FormSection>
                )}

                {simulacao && simulacao.cronogramaFuturo.length > 0 && (
                  <FormSection
                    title="Prévia do cronograma futuro"
                    description="Valores projetados para as novas parcelas após a transição."
                    contentClassName="!block"
                  >
                    <DashboardDataTableShell inset>
                      <DataTable
                        value={simulacao.cronogramaFuturo}
                        className={DASHBOARD_DATATABLE_CLASS}
                        pt={TABLE_PT_COMPACT}
                      >
                        <Column
                          header="Parcela"
                          body={(row) => dashboardCellMono(String(row.numeroParcela))}
                          style={{ width: "5rem" }}
                        />
                        <Column header="Vencimento" body={(row) => dashboardCellText(formatDate(row.vencimento))} />
                        <Column
                          header="Valor nominal"
                          body={(row) => dashboardCellMono(formatBrl(row.valorNominal))}
                        />
                      </DataTable>
                    </DashboardDataTableShell>
                  </FormSection>
                )}
              </div>
            )}

            {stepId === "publicar" && (
              <div className="space-y-8">
                <FormSection
                  title="Rascunho da versão"
                  description="Revise o rascunho gerado e conclua pendências antes de publicar."
                  accent="emerald"
                  contentClassName="!block space-y-4"
                >
                  {versaoId ? (
                    <p className="text-sm text-emerald-400/90">
                      Rascunho <strong className="font-mono">#{versaoId}</strong> pronto para publicação.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      label="Criar rascunho"
                      icon={<Save className="h-4 w-4" />}
                      onClick={() => void salvarRascunho()}
                      loading={loading}
                      className="rounded-2xl border-none bg-blue-600 px-6 font-bold shadow-lg shadow-blue-600/20"
                    />
                  )}

                  {simulacao?.exigeAprovacaoAdmin && isAdmin() && versaoId && (
                    <Button
                      type="button"
                      label="Aprovar redução (admin)"
                      onClick={() => void handleAprovar()}
                      loading={loading}
                      severity="warning"
                      className="rounded-2xl font-bold"
                    />
                  )}
                </FormSection>

                {simulacao?.exigePdfAditivo && (
                  <FormSection
                    title="PDF do aditivo assinado"
                    description="Anexe o documento assinado pelo cliente (obrigatório para tipos A e B)."
                    contentClassName="!block space-y-4"
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-white"
                    />
                    {pdfFile && (
                      <p className={ADITIVO_HINT_CLASS}>
                        Arquivo selecionado: <span className="text-white/70">{pdfFile.name}</span>
                      </p>
                    )}
                    <Button
                      type="button"
                      label="Enviar PDF"
                      icon={<FileUp className="h-4 w-4" />}
                      onClick={() => void handleUploadPdf()}
                      loading={loading}
                      disabled={!pdfFile || !versaoId}
                      className="rounded-2xl border-none bg-blue-600 px-6 font-bold shadow-lg shadow-blue-600/20"
                    />
                  </FormSection>
                )}

                {simulacao && (
                  <FormSection
                    title="Resumo"
                    description="Confira os valores finais antes de publicar a nova versão."
                    contentClassName="!block"
                  >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <MetricTile label="Total novo" value={formatBrl(simulacao.totalNovo)} />
                      <MetricTile label="Saldo devedor" value={formatBrl(simulacao.saldoDevedor)} />
                      <MetricTile
                        label="Títulos a cancelar"
                        value={String(simulacao.titulosAfetados.length)}
                      />
                      <MetricTile label="Parcela inicial" value={String(parcelaInicial)} />
                    </div>
                  </FormSection>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          label={isFirstStep ? "Cancelar" : "Voltar"}
          icon={isFirstStep ? "pi pi-times" : "pi pi-arrow-left"}
          className="p-button-text text-white/40 hover:text-white"
          onClick={handleBack}
        />

        <div className="flex flex-wrap gap-3">
          {!isLastStep ? (
            <Button
              type="button"
              label="Próximo passo"
              icon="pi pi-arrow-right"
              iconPos="right"
              onClick={() => void handleNext()}
              loading={loading}
              className="rounded-2xl border-none bg-blue-600 px-8 py-3 font-bold shadow-lg shadow-blue-600/20"
            />
          ) : (
            <Button
              type="button"
              label="Publicar versão"
              icon={<Send className="h-4 w-4" />}
              onClick={() => void handlePublicar()}
              loading={loading}
              disabled={!versaoId}
              className="rounded-2xl border-none bg-emerald-600 px-8 py-3 text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20"
            />
          )}
        </div>
      </div>
    </div>
  );
}
