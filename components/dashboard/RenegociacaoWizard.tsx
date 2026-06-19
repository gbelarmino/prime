"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calculator, Download, FileText, Scale } from "lucide-react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { toast } from "sonner";
import { FormSection } from "@/components/dashboard/cliente-form/FormSection";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { RenegociacaoContratoResumo } from "@/components/dashboard/renegociacao-form/RenegociacaoContratoResumo";
import {
  RENEGOCIACAO_WIZARD_STEPS,
  RenegociacaoWorkflowStepper,
} from "@/components/dashboard/renegociacao-form/RenegociacaoWorkflowStepper";
import {
  RENEGOCIACAO_DROPDOWN_PT,
  RENEGOCIACAO_HINT_CLASS,
  RENEGOCIACAO_INPUT_CLASS,
  RENEGOCIACAO_LABEL_CLASS,
} from "@/components/dashboard/renegociacao-form/constants";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { textoSaldoDevedorComMemoria } from "@/lib/atendimento-saldo-memoria";
import { atendimentoService, type AtendimentoResumoFinanceiro } from "@/lib/atendimento-service";
import { apiFetch } from "@/lib/api-fetch";
import { getContratoHonorariosByIdUrl } from "@/lib/api-config";
import {
  aprovarRenegociacao,
  condicoesSimulacaoParaRenegociacao,
  criarRenegociacao,
  obterRenegociacao,
  obterRenegociacaoAtivaEmAndamento,
  efetivarRenegociacao,
  gerarDocumentosRenegociacao,
  gerarPropostaRenegociacao,
  modalidadeEfetivaNoWizard,
  modalidadeUsaMotorCondicoes,
  alinharSimulacaoQuitacaoT4,
  baixarPropostaPdfT1,
  simularQuitacaoLocal,
  simularRenegociacao,
  simularViaCondicoesVersao,
  submeterAprovacao,
} from "@/lib/renegociacao-service";
import {
  AJUDA_PARAMETROS_POR_MODALIDADE,
  defaultsParametrosModalidade,
} from "@/lib/renegociacao-wizard-params";
import { fetchBoletoEncargosConfig, type BoletoEncargosConfig } from "@/lib/fin-memorial-calculo";
import { montarBaseQuitacaoLocal } from "@/lib/renegociacao-quitacao-calculo";
import {
  agregadoInadimplenciaParaExibicao,
  agregarInadimplenciaPresente,
  titulosVencidosDoPainel,
} from "@/lib/renegociacao-inadimplencia-presente";
import { InadimplenciaPresenteCard } from "@/components/dashboard/renegociacao-form/InadimplenciaPresenteCard";
import { QuitacaoLiquidacaoMemoriaCard } from "@/components/dashboard/renegociacao-form/QuitacaoLiquidacaoMemoriaCard";
import { T1AcordoDetalheCard } from "@/components/dashboard/renegociacao-form/T1AcordoDetalheCard";
import { RenegociacaoEfetivacaoResumo } from "@/components/dashboard/renegociacao-form/RenegociacaoEfetivacaoResumo";
import {
  MODALIDADE_OPTIONS,
  STATUS_RENEGOCIACAO_LABEL,
  type ModalidadeRenegociacao,
  type RenegociacaoSimulacaoResponse,
} from "@/lib/renegociacao-types";
import {
  condicoesToApiPayload,
  contratoResponseToFormValues,
  type ContratoHonorariosApiResponse,
  type ContratoHonorariosFormValues,
} from "@/lib/validations/contrato-honorarios";
import { cn } from "@/lib/utils";
import { previewT1Acordo } from "@/lib/renegociacao-t1-calculo";
import {
  buildRenegociacaoDashboardUrl,
  MODALIDADE_ATALHO_ADITIVO,
} from "@/lib/renegociacao-routes";

type Props = {
  contratoId: number;
  renegociacaoIdInicial?: number | null;
  /** Ex.: atalho do antigo “Aditivo contrato” (T2). */
  modalidadeInicial?: ModalidadeRenegociacao | null;
};

const LAST_STEP = RENEGOCIACAO_WIZARD_STEPS.length - 1;
const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

const STEP_MOTION = {
  initial: { opacity: 0, y: 10, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(10px)" },
  transition: { duration: 0.35, ease: "circOut" as const },
};

function formatBrl(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <p className="mt-2 break-words font-mono text-base font-semibold text-white sm:text-lg">{value}</p>
    </div>
  );
}

export function RenegociacaoWizard({
  contratoId,
  renegociacaoIdInicial,
  modalidadeInicial = null,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [contrato, setContrato] = useState<ContratoHonorariosFormValues | null>(null);
  const [contratoApi, setContratoApi] = useState<ContratoHonorariosApiResponse | null>(null);
  const [financeiro, setFinanceiro] = useState<AtendimentoResumoFinanceiro | null>(null);
  const [financeiroCarregando, setFinanceiroCarregando] = useState(true);
  const [modalidade, setModalidade] = useState<ModalidadeRenegociacao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [renegociacaoId, setRenegociacaoId] = useState<number | null>(renegociacaoIdInicial ?? null);
  const [modoRascunhoLocal, setModoRascunhoLocal] = useState(false);
  const [parcelaInicial, setParcelaInicial] = useState(1);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState(12);
  const [pctDesconto, setPctDesconto] = useState<number | null>(null);
  const [primeiroVencimento, setPrimeiroVencimento] = useState<string | null>(null);
  const [valorEntrada, setValorEntrada] = useState<number | null>(null);
  const [nrProcesso, setNrProcesso] = useState("");
  const [simulacao, setSimulacao] = useState<RenegociacaoSimulacaoResponse | null>(null);
  const [propostaId, setPropostaId] = useState<number | null>(null);
  const [workflowOk, setWorkflowOk] = useState(false);
  const [documentosOk, setDocumentosOk] = useState(false);
  const [processoRetomado, setProcessoRetomado] = useState(false);
  const [encargos, setEncargos] = useState<BoletoEncargosConfig | null>(null);
  const [baixandoProposta, setBaixandoProposta] = useState(false);

  useEffect(() => {
    fetchBoletoEncargosConfig()
      .then(setEncargos)
      .catch(() =>
        setEncargos({ multaPercentual: 2, jurosMensalPercentual: 1 }),
      );
  }, []);

  const modalidadeMeta = useMemo(
    () => MODALIDADE_OPTIONS.find((o) => o.value === modalidade),
    [modalidade],
  );

  const motivoPadraoModalidade = useCallback((m: ModalidadeRenegociacao) => {
    const label = MODALIDADE_OPTIONS.find((o) => o.value === m)?.label;
    return label
      ? `Renegociação — ${label} (fluxo unificado, ex-aditivo quando aplicável)`
      : "Renegociação de condições financeiras";
  }, []);

  const aplicarModalidade = useCallback(
    (value: ModalidadeRenegociacao | null) => {
      setModalidade(value);
      if (!value) return;
      setMotivo((prev) => (prev.trim() ? prev : motivoPadraoModalidade(value)));
    },
    [motivoPadraoModalidade],
  );

  const ajudaParametros = modalidade ? AJUDA_PARAMETROS_POR_MODALIDADE[modalidade] : undefined;

  const previewQuitacao = useMemo(() => {
    if (modalidade !== "T4_QUITACAO" || !financeiro) return null;
    return montarBaseQuitacaoLocal(financeiro, parcelaInicial, encargos ?? undefined);
  }, [modalidade, financeiro, parcelaInicial, encargos]);

  const previewInadimplenciaVp = useMemo(() => {
    if (!financeiro || !encargos) return null;
    if (modalidade !== "T1_PARCELAS_VENCIDAS" && modalidade !== "T4_QUITACAO") return null;
    const vencidos = titulosVencidosDoPainel(
      financeiro.titulosAbertos.filter((t) => t.numeroParcela >= parcelaInicial),
      financeiro.titulosVencidos.filter((t) => t.numeroParcela >= parcelaInicial),
    );
    return agregarInadimplenciaPresente(vencidos, encargos);
  }, [financeiro, encargos, modalidade, parcelaInicial]);

  const previewT1 = useMemo(() => {
    if (modalidade !== "T1_PARCELAS_VENCIDAS" || !financeiro || !encargos) return null;
    return previewT1Acordo({
      titulosAbertos: financeiro.titulosAbertos,
      titulosVencidos: financeiro.titulosVencidos ?? [],
      encargos,
      parcelaInicial,
      quantidadeParcelas,
      pctDesconto,
    });
  }, [modalidade, financeiro, encargos, parcelaInicial, quantidadeParcelas, pctDesconto]);

  const inadimplenciaSimulacao = useMemo(() => {
    if (!simulacao || (modalidade !== "T4_QUITACAO" && modalidade !== "T1_PARCELAS_VENCIDAS")) {
      return null;
    }
    return agregadoInadimplenciaParaExibicao(
      financeiro,
      encargos,
      parcelaInicial,
      simulacao.memoriaCalculo?.itens,
      simulacao.totalAnterior,
    );
  }, [simulacao, financeiro, encargos, parcelaInicial, modalidade]);

  /** Mesma base do passo de parâmetros (saldo + VP), independente do totalAnterior da API. */
  const inadimplenciaQuitacaoExibicao = useMemo(() => {
    if (modalidade !== "T4_QUITACAO") return null;
    return (
      inadimplenciaSimulacao ??
      previewInadimplenciaVp ??
      null
    );
  }, [modalidade, inadimplenciaSimulacao, previewInadimplenciaVp]);

  useEffect(() => {
    if (!modalidade) return;
    const d = defaultsParametrosModalidade(modalidade, financeiro ?? undefined);
    if (d.parcelaInicial != null) setParcelaInicial(d.parcelaInicial);
    if (d.quantidadeParcelas != null) setQuantidadeParcelas(d.quantidadeParcelas);
  }, [modalidade, financeiro?.titulosAbertos]);

  useEffect(() => {
    if (!modalidadeInicial) return;
    aplicarModalidade(modalidadeInicial);
  }, [modalidadeInicial, aplicarModalidade]);

  useEffect(() => {
    const id = renegociacaoIdInicial;
    if (id == null || id <= 0) return;
    let cancelled = false;
    obterRenegociacao(contratoId, id)
      .then((det) => {
        if (cancelled) return;
        if (!modalidadeInicial) setModalidade(det.modalidade);
        if (det.motivo?.trim()) {
          setMotivo((prev) => (prev.trim() ? prev : det.motivo!.trim()));
        }
      })
      .catch(() => {
        /* processo inexistente ou API indisponível */
      });
    return () => {
      cancelled = true;
    };
  }, [contratoId, renegociacaoIdInicial, modalidadeInicial]);

  useEffect(() => {
    if (renegociacaoIdInicial != null && renegociacaoIdInicial > 0) return;
    let cancelled = false;
    obterRenegociacaoAtivaEmAndamento(contratoId)
      .then((ativa) => {
        if (cancelled || !ativa) return;
        setRenegociacaoId(ativa.id);
        setProcessoRetomado(true);
        if (!modalidadeInicial) setModalidade(ativa.modalidade);
      })
      .catch(() => {
        /* API indisponível */
      });
    return () => {
      cancelled = true;
    };
  }, [contratoId, renegociacaoIdInicial, modalidadeInicial]);

  useEffect(() => {
    let cancelled = false;
    setFinanceiroCarregando(true);
    setFinanceiro(null);

    (async () => {
      const url = getContratoHonorariosByIdUrl(contratoId);
      const painelPromise = atendimentoService.getPainel(contratoId).catch(() => null);

      if (url) {
        const res = await apiFetch(url);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as ContratoHonorariosApiResponse;
          setContratoApi(data);
          setContrato(contratoResponseToFormValues(data));
        }
      }

      const painel = await painelPromise;
      if (!cancelled) {
        setFinanceiro(painel);
        setFinanceiroCarregando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contratoId]);

  const garantirProcesso = useCallback(async (): Promise<number | null> => {
    if (renegociacaoId != null) return renegociacaoId;
    if (!modalidade || !motivo.trim()) {
      toast.error("Selecione a modalidade e informe o motivo.");
      return null;
    }
    try {
      const created = await criarRenegociacao(contratoId, {
        modalidade,
        motivo: motivo.trim(),
        canal: "DASHBOARD",
      });
      setRenegociacaoId(created.id);
      setModoRascunhoLocal(false);
      return created.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao abrir processo";
      if (
        msg.includes("em andamento") ||
        msg.includes("409") ||
        msg.toLowerCase().includes("conflict")
      ) {
        try {
          const ativa = await obterRenegociacaoAtivaEmAndamento(contratoId);
          if (ativa) {
            setRenegociacaoId(ativa.id);
            setProcessoRetomado(true);
            setModoRascunhoLocal(false);
            const statusLabel = STATUS_RENEGOCIACAO_LABEL[ativa.status] ?? ativa.status;
            toast.info(
              `Retomando o processo #${ativa.id} (${statusLabel}). Para abrir outro, cancele este processo antes.`,
            );
            return ativa.id;
          }
        } catch {
          /* segue para mensagem original */
        }
      }
      if (msg.includes("404") || msg.includes("501") || msg.includes("Erro 5")) {
        setModoRascunhoLocal(true);
        setRenegociacaoId(-1);
        toast.info("API de renegociação em implantação — simulação via motor de condições (Fase 1).");
        return -1;
      }
      toast.error(msg);
      return null;
    }
  }, [contratoId, modalidade, motivo, renegociacaoId]);

  const executarSimulacao = async () => {
    if (!modalidade || !contrato) {
      toast.error("Dados insuficientes para simular.");
      return;
    }
    setLoading(true);
    try {
      const procId = await garantirProcesso();
      if (procId == null) return;

      if (procId > 0) {
        try {
          const payload = condicoesToApiPayload(contrato);
          const res = await simularRenegociacao(contratoId, procId, {
            modalidade,
            parcelaInicial,
            quantidadeParcelas,
            primeiroVencimento: primeiroVencimento ?? undefined,
            pctDesconto: pctDesconto ?? undefined,
            valorEntrada: valorEntrada ?? undefined,
            condicoes: modalidadeUsaMotorCondicoes(modalidade) ? payload : undefined,
            politicaReajuste: modalidadeUsaMotorCondicoes(modalidade) ? "CADEIA" : undefined,
            confirmarCancelamentoTitulos:
              modalidadeUsaMotorCondicoes(modalidade) ||
              modalidade === "T4_QUITACAO" ||
              modalidade === "T1_PARCELAS_VENCIDAS"
                ? true
                : undefined,
            dadosJudiciais:
              modalidade === "T6_JUDICIAL"
                ? { nrProcesso: nrProcesso.trim() || undefined }
                : undefined,
          });
          if (
            modalidade === "T4_QUITACAO" &&
            res.avisos.some((a) => a.toLowerCase().includes("parcelas vencidas"))
          ) {
            toast.error(
              "A API simulou parcelas vencidas (T1) em vez de liquidação antecipada (T4). Reinicie o backend e confirme a modalidade no passo anterior.",
            );
            return;
          }
          let simFinal = res;
          if (modalidade === "T4_QUITACAO" && financeiro) {
            const localT4 = simularQuitacaoLocal(financeiro, {
              parcelaInicial,
              quantidadeParcelas,
              pctDesconto,
              primeiroVencimento,
              diaVencimentoContrato: contratoApi?.condicoes?.diaVencimento ?? undefined,
              encargos: encargos ?? undefined,
            });
            simFinal = alinharSimulacaoQuitacaoT4(res, localT4);
            if (previewQuitacao && Math.abs(res.totalAnterior - previewQuitacao.baseQuitacao) > 1) {
              toast.info(
                "Totais alinhados à prévia (saldo devedor + inadimplência a valor presente).",
              );
            }
          }
          if (simFinal.totalAnterior <= 0 && simFinal.totalNovo <= 0) {
            toast.error(
              simFinal.avisos[0] ??
                "Simulação sem valores — confira modalidade, saldo do contrato ou títulos vencidos.",
            );
            return;
          }
          setSimulacao(simFinal);
          setModoRascunhoLocal(false);
          setStep(3);
          return;
        } catch (apiErr) {
          const msg = apiErr instanceof Error ? apiErr.message : "";
          if (msg && !msg.includes("404") && !msg.includes("501")) {
            toast.error(msg);
            return;
          }
          /* fallback abaixo */
        }
      }

      if (modalidadeUsaMotorCondicoes(modalidade)) {
        const payload = condicoesToApiPayload(contrato);
        const tipoOrigem = modalidade === "T3_COMPLETA" ? "ADITIVO_GRADE" : "RENEGOCIACAO_SALDO";
        const raw = await simularViaCondicoesVersao(contratoId, {
          tipoOrigem,
          parcelaInicial,
          condicoes: payload as unknown as Record<string, unknown>,
          motivo: motivo.trim() || "Renegociação via wizard unificado",
          politicaReajuste: "CADEIA",
        });
        setSimulacao(condicoesSimulacaoParaRenegociacao(raw));
        setStep(3);
        return;
      }

      if (modalidade === "T4_QUITACAO" && financeiro) {
        const local = simularQuitacaoLocal(financeiro, {
          parcelaInicial,
          quantidadeParcelas,
          pctDesconto,
          primeiroVencimento,
          diaVencimentoContrato: contratoApi?.condicoes?.diaVencimento ?? undefined,
          encargos: encargos ?? undefined,
        });
        if (local.totalAnterior <= 0 && local.saldoDevedor <= 0) {
          toast.error(
            "Saldo devedor zerado na visão geral — contrato quitado ou sem base para liquidação antecipada.",
          );
          return;
        }
        setSimulacao(local);
        setModoRascunhoLocal(true);
        setStep(3);
        return;
      }

      if (modalidade === "T5_COM_ENTRADA") {
        toast.info(
          "T5 no atendimento até unificação completa. Use o painel de atendimento ou conclua via aditivo.",
          {
            action: {
              label: "Atendimento",
              onClick: () => router.push(`/dashboard/atendimento?contratoId=${contratoId}`),
            },
          },
        );
        return;
      }

      toast.warning("Simulação automática ainda não disponível para esta modalidade.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na simulação");
    } finally {
      setLoading(false);
    }
  };

  const baixarPropostaT1Pdf = async () => {
    const procId = renegociacaoId;
    const simId = simulacao?.simulacaoId;
    if (procId == null || procId <= 0 || simId == null) {
      toast.error("Simule novamente pelo backend para gerar o PDF da proposta.");
      return;
    }
    setBaixandoProposta(true);
    try {
      await baixarPropostaPdfT1(contratoId, procId, simId);
      toast.success("Proposta T1 baixada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar proposta");
    } finally {
      setBaixandoProposta(false);
    }
  };

  const dtValidadeProposta = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  }, []);

  const processarPropostaAprovacao = async () => {
    const procId = renegociacaoId;
    if (procId == null || procId <= 0 || !simulacao?.simulacaoId) {
      toast.error("Simulação ou processo inválido.");
      return;
    }
    setLoading(true);
    try {
      const proposta = await gerarPropostaRenegociacao(contratoId, procId, {
        simulacaoId: simulacao.simulacaoId,
        dtValidade: dtValidadeProposta,
      });
      setPropostaId(proposta.id);
      if (simulacao.exigeAprovacao) {
        await submeterAprovacao(contratoId, procId);
        await aprovarRenegociacao(contratoId, procId, "Aprovação via wizard");
      } else {
        await submeterAprovacao(contratoId, procId);
      }
      setWorkflowOk(true);
      toast.success("Proposta registrada e fluxo de aprovação concluído.");
      setStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na proposta/aprovação");
    } finally {
      setLoading(false);
    }
  };

  const processarDocumentos = async () => {
    const procId = renegociacaoId;
    if (procId == null || procId <= 0) return;
    setLoading(true);
    try {
      await gerarDocumentosRenegociacao(contratoId, procId);
      setDocumentosOk(true);
      toast.success("Documentos marcados para geração.");
      setStep(6);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar documentos");
    } finally {
      setLoading(false);
    }
  };

  const processarEfetivacao = async () => {
    const procId = renegociacaoId;
    if (procId == null || procId <= 0) return;
    if (!modalidadeEfetivaNoWizard(modalidade)) {
      toast.info("T4/T6: efetive via painel de atendimento ou aguarde integração de títulos.");
      return;
    }
    setLoading(true);
    try {
      const key = `reneg-${procId}-${Date.now()}`;
      const titulosCancelarIds =
        simulacao?.titulosAfetados.map((t) => t.id) ?? [];
      const res = await efetivarRenegociacao(
        contratoId,
        procId,
        { confirmarCancelamentoTitulos: true, titulosCancelarIds },
        key,
      );
      const msg =
        modalidade === "T1_PARCELAS_VENCIDAS"
          ? "Renegociação T1 efetivada — títulos cancelados e reemitidos."
          : `Renegociação efetivada. Versão #${res.versaoPublicadaId ?? "—"}.`;
      toast.success(msg);
      router.push(`/dashboard/contratos?highlight=${contratoId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na efetivação");
    } finally {
      setLoading(false);
    }
  };

  const avancar = async () => {
    if (step === 0) {
      if (!contratoApi) {
        toast.error("Aguarde o carregamento do contrato.");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!modalidade) {
        toast.error("Selecione a modalidade.");
        return;
      }
      if (!motivo.trim()) {
        setMotivo(motivoPadraoModalidade(modalidade));
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (modalidade === "T1_PARCELAS_VENCIDAS" && previewT1?.erro) {
        toast.error(previewT1.erro);
        return;
      }
      await executarSimulacao();
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      await processarPropostaAprovacao();
      return;
    }
    if (step === 5) {
      await processarDocumentos();
      return;
    }
    if (step < LAST_STEP) setStep((s) => s + 1);
  };

  const voltar = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div>
      {processoRetomado && renegociacaoId != null && renegociacaoId > 0 && (
        <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/90">
          Processo <span className="font-mono font-semibold text-white">#{renegociacaoId}</span> já
          está em andamento neste contrato. As próximas simulações atualizam esse processo. Para
          iniciar outro do zero, cancele o atual antes (via API ou suporte).
        </div>
      )}

      {modoRascunhoLocal && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Modo protótipo: endpoints <code className="text-amber-200">/renegociacoes</code> pendentes no
          backend. Simulação T2/T3 usa o motor de{" "}
          <Link
            href={buildRenegociacaoDashboardUrl({
              contratoId,
              modalidade: MODALIDADE_ATALHO_ADITIVO,
            })}
            className="underline"
          >
            saldo devedor (T2)
          </Link>
          .
        </div>
      )}

      <RenegociacaoWorkflowStepper activeStep={step} onStepClick={(i) => i < step && setStep(i)} />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="v" {...STEP_MOTION}>
            <FormSection
              title="Visão geral"
              description="Resumo do contrato vigente antes de definir a modalidade e os novos parâmetros da renegociação."
              contentClassName="!grid-cols-1 w-full min-w-0"
            >
              {contratoApi ? (
                <RenegociacaoContratoResumo
                  contrato={contratoApi}
                  financeiro={financeiro}
                  financeiroCarregando={financeiroCarregando}
                />
              ) : (
                <p className="w-full text-sm text-white/40">Carregando dados do contrato…</p>
              )}
            </FormSection>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="m" {...STEP_MOTION}>
            <FormSection
              title="Modalidade e motivo"
              description="Define o tipo jurídico-operacional da renegociação. Cada modalidade gera trilha e documentos distintos."
            >
              <div className="grid gap-6">
                <div>
                  <label className={RENEGOCIACAO_LABEL_CLASS}>Modalidade</label>
                  <Dropdown
                    value={modalidade}
                    options={MODALIDADE_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => aplicarModalidade(e.value ?? null)}
                    placeholder="Selecione…"
                    pt={RENEGOCIACAO_DROPDOWN_PT}
                    className="w-full"
                  />
                  {modalidadeMeta && (
                    <p className={RENEGOCIACAO_HINT_CLASS}>
                      {modalidadeMeta.hint}
                      <span className="mt-1 block text-violet-300/80">
                        <Scale className="mr-1 inline h-3 w-3" />
                        Instrumentos sugeridos: {modalidadeMeta.juridico}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className={RENEGOCIACAO_LABEL_CLASS}>Motivo</label>
                  <InputTextarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    className={cn(RENEGOCIACAO_INPUT_CLASS, "min-h-[88px]")}
                    placeholder="Ex.: recuperação de inadimplência — acordo comercial aprovado em…"
                  />
                </div>
              </div>
            </FormSection>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="p" {...STEP_MOTION}>
            <FormSection
              title="Parâmetros financeiros"
              description={
                ajudaParametros?.descricaoPasso ??
                "Entrada para o motor de cálculo. Valores definitivos após simulação."
              }
              contentClassName="!grid-cols-1 !gap-8 w-full min-w-0"
            >
              <div className="flex w-full min-w-0 flex-col gap-8">
                {modalidade === "T4_QUITACAO" && previewQuitacao && (
                  <div className="flex w-full flex-col gap-3">
                    <MetricTile
                      label="Saldo devedor"
                      value={
                        financeiro
                          ? textoSaldoDevedorComMemoria(
                              financeiro,
                              contratoApi?.condicoes?.valorParcela ?? undefined,
                            )
                          : formatBrl(previewQuitacao.saldoDevedorContrato)
                      }
                    />
                    <InadimplenciaPresenteCard
                      agregado={previewInadimplenciaVp}
                      nominalPainel={previewQuitacao.valorInadimplenteNominal}
                    />
                    <MetricTile
                      label="Total anterior (prévia)"
                      value={formatBrl(previewQuitacao.baseQuitacao)}
                    />
                  </div>
                )}
                {modalidade === "T1_PARCELAS_VENCIDAS" && previewInadimplenciaVp && (
                  <>
                    <InadimplenciaPresenteCard
                      agregado={previewInadimplenciaVp}
                      nominalPainel={financeiro?.valorInadimplente}
                    />
                    {previewT1 && !previewT1.erro && (
                      <T1AcordoDetalheCard preview={previewT1} />
                    )}
                    {previewT1?.erro && (
                      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
                        {previewT1.erro}
                      </p>
                    )}
                  </>
                )}
                <div className="grid w-full gap-5 md:grid-cols-2">
                <div>
                  <label className={RENEGOCIACAO_LABEL_CLASS}>Parcela inicial (corte)</label>
                  <InputNumber
                    value={parcelaInicial}
                    onValueChange={(e) => setParcelaInicial(e.value ?? 1)}
                    min={1}
                    className="w-full"
                    inputClassName={RENEGOCIACAO_INPUT_CLASS}
                  />
                  {ajudaParametros?.parcelaInicial && (
                    <p className={RENEGOCIACAO_HINT_CLASS}>{ajudaParametros.parcelaInicial}</p>
                  )}
                </div>
                <div>
                  <label className={RENEGOCIACAO_LABEL_CLASS}>Quantidade de parcelas</label>
                  <InputNumber
                    value={quantidadeParcelas}
                    onValueChange={(e) => setQuantidadeParcelas(e.value ?? 1)}
                    min={1}
                    max={modalidade === "T4_QUITACAO" ? 24 : 360}
                    className="w-full"
                    inputClassName={RENEGOCIACAO_INPUT_CLASS}
                  />
                  {ajudaParametros?.quantidadeParcelas && (
                    <p className={RENEGOCIACAO_HINT_CLASS}>{ajudaParametros.quantidadeParcelas}</p>
                  )}
                </div>
                <div>
                  <label className={RENEGOCIACAO_LABEL_CLASS}>
                    Desconto (%){modalidade === "T4_QUITACAO" ? " (opcional)" : ""}
                  </label>
                  <InputNumber
                    value={pctDesconto}
                    onValueChange={(e) => setPctDesconto(e.value ?? null)}
                    min={0}
                    max={100}
                    suffix="%"
                    placeholder={modalidade === "T4_QUITACAO" ? "Sem desconto" : undefined}
                    className="w-full"
                    inputClassName={RENEGOCIACAO_INPUT_CLASS}
                  />
                  {ajudaParametros?.desconto && (
                    <p className={RENEGOCIACAO_HINT_CLASS}>{ajudaParametros.desconto}</p>
                  )}
                </div>
                {modalidade === "T5_COM_ENTRADA" && (
                  <div>
                    <label className={RENEGOCIACAO_LABEL_CLASS}>Valor entrada</label>
                    <InputNumber
                      value={valorEntrada}
                      onValueChange={(e) => setValorEntrada(e.value ?? null)}
                      mode="currency"
                      currency="BRL"
                      locale="pt-BR"
                      className="w-full"
                      inputClassName={RENEGOCIACAO_INPUT_CLASS}
                    />
                  </div>
                )}
                {modalidade === "T4_QUITACAO" && (
                  <div>
                    <label className={RENEGOCIACAO_LABEL_CLASS}>Primeiro vencimento (pagamento)</label>
                    <input
                      type="date"
                      value={primeiroVencimento ?? ""}
                      onChange={(e) => setPrimeiroVencimento(e.target.value || null)}
                      className={RENEGOCIACAO_INPUT_CLASS}
                    />
                    <p className={RENEGOCIACAO_HINT_CLASS}>
                      Opcional. Padrão: 15 dias a partir de hoje. Demais parcelas no dia de vencimento do
                      contrato; fins de semana vão para a segunda-feira.
                    </p>
                  </div>
                )}
                {modalidade === "T6_JUDICIAL" && (
                  <div className="md:col-span-2">
                    <label className={RENEGOCIACAO_LABEL_CLASS}>Nº processo</label>
                    <input
                      type="text"
                      value={nrProcesso}
                      onChange={(e) => setNrProcesso(e.target.value)}
                      className={RENEGOCIACAO_INPUT_CLASS}
                      placeholder="0000000-00.0000.0.00.0000"
                    />
                  </div>
                )}
                </div>
              </div>
            </FormSection>
          </motion.div>
        )}

        {step === 3 && simulacao && (
          <motion.div key="s" {...STEP_MOTION}>
            <FormSection
              title="Resultado da simulação"
              description={
                modalidade === "T4_QUITACAO"
                  ? "Liquidação: memória (saldo devedor + inadimplência a VP − desconto) e parcelas de pagamento. Nada altera o contrato até assinatura."
                  : modalidade === "T1_PARCELAS_VENCIDAS"
                    ? "Acordo T1: mora a valor presente diluída e somada às próximas vincendas. Revise cada passo antes de gerar a proposta."
                    : "Nenhuma alteração financeira até efetivação assinada."
              }
              contentClassName="!grid-cols-1 !gap-6 w-full min-w-0"
            >
              <div className="flex w-full flex-col gap-6">
                {modalidade === "T4_QUITACAO" && simulacao.memoriaCalculo ? (
                  <>
                    <QuitacaoLiquidacaoMemoriaCard
                      saldoDevedor={simulacao.saldoDevedor}
                      saldoDevedorDetalhe={
                        financeiro
                          ? textoSaldoDevedorComMemoria(
                              financeiro,
                              contratoApi?.condicoes?.valorParcela ?? undefined,
                            )
                          : undefined
                      }
                      inadimplenciaAgregado={inadimplenciaQuitacaoExibicao}
                      nominalPainel={financeiro?.valorInadimplente}
                      inadimplenciaVpFallback={
                        simulacao.memoriaCalculo.vlValorPresente ?? 0
                      }
                      desconto={simulacao.memoriaCalculo.vlDesconto}
                      pctDesconto={simulacao.pctDesconto}
                    />
                    <div className="flex w-full flex-col gap-2">
                      <p className="text-sm font-medium text-white/80">Parcelas do pagamento</p>
                      <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
                        <DataTable
                          value={simulacao.cronogramaFuturo}
                          className={DASHBOARD_DATATABLE_CLASS}
                          pt={TABLE_PT}
                          emptyMessage="Sem parcelas no cronograma simulado."
                        >
                          <Column
                            field="numeroParcela"
                            header="Parc."
                            body={(r) => dashboardCellMono(String(r.numeroParcela))}
                          />
                          <Column
                            field="vencimento"
                            header="Vencimento"
                            body={(r) =>
                              dashboardCellText(new Date(r.vencimento).toLocaleDateString("pt-BR"))
                            }
                          />
                          <Column
                            field="valorNominal"
                            header="Valor"
                            body={(r) => dashboardCellMono(formatBrl(r.valorNominal))}
                          />
                        </DataTable>
                      </DashboardDataTableShell>
                    </div>
                  </>
                ) : modalidade === "T1_PARCELAS_VENCIDAS" ? (
                  <>
                    <div className="flex w-full flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                      <MetricTile label="Mora (VP)" value={formatBrl(simulacao.totalAnterior)} />
                      <MetricTile label="Total acordo" value={formatBrl(simulacao.totalNovo)} />
                      <MetricTile
                        label="Desconto"
                        value={formatBrl(simulacao.memoriaCalculo?.vlDesconto ?? 0)}
                      />
                      <MetricTile
                        label="Aprovação"
                        value={
                          simulacao.exigeAprovacao
                            ? `Nível ${simulacao.nrNivelAprovacaoRequerido}`
                            : "Automática"
                        }
                      />
                    </div>
                    {simulacao.memoriaCalculo && (
                      <InadimplenciaPresenteCard
                        agregado={inadimplenciaSimulacao}
                        nominalPainel={financeiro?.valorInadimplente}
                      />
                    )}
                    <T1AcordoDetalheCard simulacao={simulacao} />
                  </>
                ) : (
                  <>
                    <div className="flex w-full flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                      <MetricTile label="Total anterior" value={formatBrl(simulacao.totalAnterior)} />
                      <MetricTile label="Total novo" value={formatBrl(simulacao.totalNovo)} />
                      <MetricTile label="Saldo devedor" value={formatBrl(simulacao.saldoDevedor)} />
                      <MetricTile
                        label="Aprovação"
                        value={
                          simulacao.exigeAprovacao
                            ? `Nível ${simulacao.nrNivelAprovacaoRequerido}`
                            : "Automática"
                        }
                      />
                    </div>
                    {simulacao.avisos.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-200/90">
                        {simulacao.avisos.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                    <DashboardDataTableShell className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
                      <DataTable
                        value={simulacao.cronogramaFuturo}
                        className={DASHBOARD_DATATABLE_CLASS}
                        pt={TABLE_PT}
                        emptyMessage="Sem parcelas no cronograma simulado."
                      >
                        <Column
                          field="numeroParcela"
                          header="Parc."
                          body={(r) => dashboardCellMono(String(r.numeroParcela))}
                        />
                        <Column
                          field="vencimento"
                          header="Vencimento"
                          body={(r) =>
                            dashboardCellText(new Date(r.vencimento).toLocaleDateString("pt-BR"))
                          }
                        />
                        <Column
                          field="valorNominal"
                          header="Valor"
                          body={(r) => dashboardCellMono(formatBrl(r.valorNominal))}
                        />
                      </DataTable>
                    </DashboardDataTableShell>
                  </>
                )}
              </div>
            </FormSection>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="a" {...STEP_MOTION}>
            <FormSection
              title="Proposta e aprovação"
              description="Gera proposta congelada e conclui alçada (automática ou manual)."
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-white/60">
                  {simulacao?.exigeAprovacao
                    ? `Exige aprovação nível ${simulacao.nrNivelAprovacaoRequerido}. Validade da proposta: ${dtValidadeProposta}.`
                    : "Alçada automática — submissão e aprovação em um passo."}
                </p>
                {workflowOk && propostaId != null && (
                  <p className="mt-3 font-mono text-xs text-emerald-300/90">Proposta #{propostaId} registrada.</p>
                )}
                {renegociacaoId != null && renegociacaoId <= 0 && (
                  <p className="mt-3 text-sm text-amber-200/80">
                    Ative o backend ou conclua apenas a simulação via condições versionadas.
                  </p>
                )}
              </div>
            </FormSection>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="d" {...STEP_MOTION}>
            <FormSection title="Documentos" description="Registra instrumentos sugeridos (PDF/assinatura em fase posterior).">
              <div className="grid gap-3 md:grid-cols-2">
                {(simulacao?.instrumentosSugeridos ?? ["ADITIVO", "TERMO_RENEGOCIACAO"]).map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <FileText className="h-8 w-8 text-violet-400" />
                    <div>
                      <p className="font-semibold text-white">{doc.replace(/_/g, " ")}</p>
                      <p className="text-xs text-white/40">
                        {documentosOk ? "Registrado no processo" : "Será registrado ao continuar"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="e" {...STEP_MOTION}>
            <FormSection
              title="Efetivação"
              description="Revise o resumo abaixo e conclua apenas se estiver de acordo com a simulação aprovada."
              contentClassName="!grid-cols-1 !gap-6 w-full min-w-0"
            >
              <RenegociacaoEfetivacaoResumo
                modalidade={modalidade}
                simulacao={simulacao}
                parcelaInicial={parcelaInicial}
                financeiro={financeiro}
                inadimplenciaQuitacao={inadimplenciaQuitacaoExibicao}
                processoId={renegociacaoId}
                documentosOk={documentosOk}
                propostaId={propostaId}
                contratoId={contratoId}
              />
              {modalidade === "T1_PARCELAS_VENCIDAS" && simulacao && (
                <T1AcordoDetalheCard simulacao={simulacao} />
              )}
              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
                {modalidadeEfetivaNoWizard(modalidade) &&
                renegociacaoId != null &&
                renegociacaoId > 0 ? (
                  <Button
                    type="button"
                    loading={loading}
                    onClick={processarEfetivacao}
                    className="rounded-full border-0 bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-widest"
                    label="Efetivar"
                  />
                ) : modalidade === "T6_JUDICIAL" ? (
                  <Link href={`/dashboard/atendimento/painel?id=${contratoId}`}>
                    <Button
                      type="button"
                      className="rounded-full border-0 bg-violet-600 px-6 py-3 text-xs font-black uppercase tracking-widest"
                      icon="pi pi-external-link"
                      label="Painel de atendimento"
                    />
                  </Link>
                ) : null}
              </div>
            </FormSection>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 1 && !modalidade && (
        <p className="mt-6 text-center text-sm text-amber-200/90">
          Selecione a modalidade acima para avançar ao passo de parâmetros.
        </p>
      )}

      <div
        className={cn(
          "mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6",
          step === 0 ? "justify-end" : step === LAST_STEP ? "justify-start" : "justify-between",
        )}
      >
        {step > 0 && (
          <Button
            type="button"
            label="Voltar"
            severity="secondary"
            disabled={loading}
            onClick={voltar}
            className="rounded-full border-white/10 bg-white/5 text-white"
          />
        )}
        <div className="flex gap-3">
          {step === 3 &&
            modalidade === "T1_PARCELAS_VENCIDAS" &&
            simulacao?.simulacaoId != null &&
            renegociacaoId != null &&
            renegociacaoId > 0 && (
              <Button
                type="button"
                label="Baixar proposta"
                icon={<Download className="mr-2 h-4 w-4" />}
                loading={baixandoProposta}
                disabled={loading || baixandoProposta}
                onClick={baixarPropostaT1Pdf}
                severity="secondary"
                className="rounded-full border-white/10 bg-white/5 text-white"
              />
            )}
          {step === 2 && (
            <Button
              type="button"
              label="Simular"
              icon={<Calculator className="mr-2 h-4 w-4" />}
              loading={loading}
              onClick={executarSimulacao}
              className="rounded-full border-0 bg-violet-600 px-6 font-black uppercase tracking-widest"
            />
          )}
          {step !== 2 && step < LAST_STEP && (
            <Button
              type="button"
              label={
                step === 4
                  ? "Gerar proposta"
                  : step === 5
                    ? "Registrar documentos"
                    : "Continuar"
              }
              icon={<ArrowRight className="mr-2 h-4 w-4" />}
              onClick={avancar}
              loading={loading && step >= 4}
              disabled={
                loading ||
                (step === 0 && !contratoApi) ||
                (step === 1 && !modalidade) ||
                (step === 3 && !simulacao) ||
                (step >= 4 && (renegociacaoId == null || renegociacaoId <= 0))
              }
              className="rounded-full border-0 bg-violet-600 px-6 font-black uppercase tracking-widest"
            />
          )}
        </div>
      </div>

      {renegociacaoId != null && renegociacaoId > 0 && (
        <p className="mt-4 text-center font-mono text-[10px] text-white/25">
          Processo #{renegociacaoId}
        </p>
      )}
    </div>
  );
}
