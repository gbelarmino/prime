"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Ban,
  Download,
  FileCheck,
  FileText,
  History,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDataPagamentoExibicao } from "@/lib/fin-vencimento";
import { dashboardCellText, dashboardStatusBadge } from "@/lib/dashboard-datatable";
import { TituloCancelarDialog, type TituloCancelarPayload } from "@/components/dashboard/fin/TituloCancelarDialog";
import { TituloLegadoManualDialog } from "@/components/dashboard/fin/TituloLegadoManualDialog";
import { TituloRegistrarConvenioDialog } from "@/components/dashboard/fin/TituloRegistrarConvenioDialog";
import { labelAcaoBoletoPdf, podeBaixarPdfBoleto } from "@/lib/baixar-boleto-pdf";
import { atendimentoService } from "@/lib/atendimento-service";
import {
  finService,
  formatContratoRef,
  type TituloCobranca,
  type TituloHistoricoItem,
} from "@/lib/fin-service";

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
  EM_CONCILIACAO: "border-blue-500/25 bg-blue-500/15 text-blue-300",
};

const LABEL_CLASS = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/30";
const VALUE_CLASS = "font-medium text-white";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hasValorPositivo(v: number | null | undefined): boolean {
  return v != null && v > 0;
}

type ActionButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

function ActionButton({ label, icon, onClick, disabled, variant = "secondary" }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500",
        variant === "secondary" &&
          "border border-white/10 bg-white/5 text-white/70 hover:border-white/15 hover:bg-white/10 hover:text-white",
        variant === "danger" &&
          "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

type TituloDetalheProps = {
  tituloId: string;
  /** Consulta somente leitura a partir do painel de atendimento. */
  variant?: "financeiro" | "atendimento";
  /** Para voltar ao painel do contrato (variant atendimento). */
  contratoId?: number;
};

export function TituloDetalhe({
  tituloId,
  variant = "financeiro",
  contratoId,
}: TituloDetalheProps) {
  const isAtendimentoView = variant === "atendimento";
  const backHref =
    isAtendimentoView && contratoId != null
      ? `/dashboard/atendimento/painel?id=${contratoId}`
      : "/dashboard/financeiro/titulos";
  const backLabel = isAtendimentoView ? "Voltar ao painel" : "Voltar à lista";
  const sectionKicker = isAtendimentoView ? "Atendimento" : "Gestão Financeira";
  const [titulo, setTitulo] = useState<TituloCobranca | null>(null);
  const [historico, setHistorico] = useState<TituloHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [valorPago, setValorPago] = useState<number | null>(null);
  const [dataPagamento, setDataPagamento] = useState<Date | null>(new Date());
  const [registrarDialogOpen, setRegistrarDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editLegadoOpen, setEditLegadoOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        finService.getTitulo(tituloId),
        finService.historico(tituloId),
      ]);
      setTitulo(t);
      setHistorico(h);
      setValorPago(t.valorNominal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar título.");
      setTitulo(null);
    } finally {
      setLoading(false);
    }
  }, [tituloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const abrirRegistrar = () => {
    if (!titulo) return;
    setRegistrarDialogOpen(true);
  };

  const confirmarRegistrar = async () => {
    setActionLoading(true);
    try {
      await finService.registrar(tituloId);
      toast.success("Título registrado e emitido.");
      setRegistrarDialogOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmarCancelar = async (payload: TituloCancelarPayload) => {
    setActionLoading(true);
    try {
      const atualizado = await finService.cancelar(tituloId, payload);
      if (atualizado.status === "BAIXA_SOLICITADA") {
        toast.success("Baixa solicitada no banco. Aguarde confirmação ou sincronize o status.");
      } else {
        toast.success("Título cancelado.");
      }
      setCancelDialogOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    } finally {
      setActionLoading(false);
    }
  };

  const sincronizarStatus = async () => {
    setActionLoading(true);
    try {
      const atualizado = await finService.sincronizarStatus(tituloId);
      if (atualizado.status === "CANCELADO") {
        toast.success("Baixa confirmada. Título cancelado.");
      } else {
        toast.info("Status atualizado no banco; ainda aguardando confirmação da baixa.");
      }
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sincronizar status.");
    } finally {
      setActionLoading(false);
    }
  };

  const liquidar = async () => {
    if (!valorPago || !dataPagamento) {
      toast.error("Informe valor e data do pagamento.");
      return;
    }
    setActionLoading(true);
    try {
      const y = dataPagamento.getFullYear();
      const m = String(dataPagamento.getMonth() + 1).padStart(2, "0");
      const d = String(dataPagamento.getDate()).padStart(2, "0");
      await finService.liquidar(tituloId, {
        valorPago,
        dataPagamento: `${y}-${m}-${d}`,
        canal: "MANUAL",
      });
      toast.success("Título liquidado.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao liquidar.");
    } finally {
      setActionLoading(false);
    }
  };

  const baixarPdf = async () => {
    setActionLoading(true);
    try {
      if (isAtendimentoView) {
        await atendimentoService.downloadPdf(tituloId, {
          urlBoleto: titulo?.urlBoleto,
          status: titulo?.status,
        });
      } else {
        await finService.downloadPdf(tituloId, titulo?.urlBoleto, titulo?.status);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar PDF.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !titulo) {
    return (
      <div className="flex flex-col gap-8 px-4 pb-20">
        <div className="h-32 animate-pulse rounded-[2rem] bg-white/5" />
        <div className="h-48 animate-pulse rounded-[2rem] bg-white/5" />
        <div className="h-40 animate-pulse rounded-[2rem] bg-white/5" />
      </div>
    );
  }

  if (!titulo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-6 text-sm text-white/50">Título não encontrado.</p>
          <Link
            href={backHref}
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const podeRegistrar = titulo.status === "RASCUNHO";
  const podeLiquidar =
    titulo.status === "EMITIDO" ||
    titulo.status === "REGISTRADO" ||
    titulo.status === "VENCIDO";
  const podeCancelar =
    titulo.status !== "PAGO" &&
    titulo.status !== "CANCELADO" &&
    titulo.status !== "BAIXA_SOLICITADA";
  const podeSincronizar = titulo.status === "BAIXA_SOLICITADA";
  const podePdf = podeBaixarPdfBoleto(titulo.status);

  const contratoRef = formatContratoRef(titulo.numeroContrato, titulo.contratoId);
  const tituloTitulo = `Contrato ${contratoRef} · Parcela ${titulo.numeroParcela}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-400 no-underline transition hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
            {sectionKicker}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white md:text-4xl">
              {tituloTitulo}
            </h1>
            {dashboardStatusBadge(titulo.status, STATUS_TONES)}
            {titulo.legado ? (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Legado
              </span>
            ) : null}
          </div>
          {titulo.convenioNome && (
            <p className="mt-2 text-sm font-medium text-white/40">{titulo.convenioNome}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isAtendimentoView && titulo.legado && (
            <ActionButton
              label="Editar legado"
              icon={<Pencil size={14} />}
              disabled={actionLoading}
              onClick={() => setEditLegadoOpen(true)}
            />
          )}
          {!isAtendimentoView && podeRegistrar && (
            <ActionButton
              label="Registrar"
              icon={<FileCheck size={14} />}
              variant="primary"
              disabled={actionLoading}
              onClick={abrirRegistrar}
            />
          )}
          {podePdf && (
            <ActionButton
              label={labelAcaoBoletoPdf(titulo?.urlBoleto)}
              icon={<Download size={14} />}
              disabled={actionLoading}
              onClick={() => void baixarPdf()}
            />
          )}
          {!isAtendimentoView && podeSincronizar && (
            <ActionButton
              label="Sincronizar status"
              icon={<RefreshCw size={14} />}
              disabled={actionLoading}
              onClick={() => void sincronizarStatus()}
            />
          )}
          {!isAtendimentoView && podeCancelar && (
            <ActionButton
              label="Cancelar"
              icon={<Ban size={14} />}
              variant="danger"
              disabled={actionLoading}
              onClick={() => setCancelDialogOpen(true)}
            />
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            <FileText size={20} />
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">
            Dados do título
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className={LABEL_CLASS}>Contrato</span>
            <p className={VALUE_CLASS}>{contratoRef}</p>
          </div>
          <div>
            <span className={LABEL_CLASS}>Parcela</span>
            <p className={VALUE_CLASS}>{titulo.numeroParcela}</p>
          </div>
          <div>
            <span className={LABEL_CLASS}>Nosso número</span>
            <p className={cn(VALUE_CLASS, "font-mono text-sm")}>{titulo.nossoNumero}</p>
          </div>
          {titulo.codigoInstrucaoBaixa ? (
            <div>
              <span className={LABEL_CLASS}>Instrução de baixa (Unicred)</span>
              <p className={cn(VALUE_CLASS, "font-mono text-sm")}>{titulo.codigoInstrucaoBaixa}</p>
            </div>
          ) : null}
          <div>
            <span className={LABEL_CLASS}>Valor nominal</span>
            <p className={cn(VALUE_CLASS, "text-lg")}>{formatMoney(titulo.valorNominal)}</p>
          </div>
          <div>
            <span className={LABEL_CLASS}>Vencimento</span>
            <p className={VALUE_CLASS}>{formatDate(titulo.vencimento)}</p>
          </div>
          {titulo.valorPago != null && (
            <div>
              <span className={LABEL_CLASS}>Valor pago</span>
              <p className={cn(VALUE_CLASS, "text-emerald-400")}>{formatMoney(titulo.valorPago)}</p>
            </div>
          )}
          {titulo.dataPagamento && (
            <div>
              <span className={LABEL_CLASS}>Data pagamento</span>
              <p className={VALUE_CLASS}>{formatDataPagamentoExibicao(titulo.dataPagamento)}</p>
            </div>
          )}
          {hasValorPositivo(titulo.valorJuros) && (
            <div>
              <span className={LABEL_CLASS}>Juros</span>
              <p className={cn(VALUE_CLASS, "text-amber-300")}>{formatMoney(titulo.valorJuros)}</p>
            </div>
          )}
          {hasValorPositivo(titulo.valorMulta) && (
            <div>
              <span className={LABEL_CLASS}>Multa</span>
              <p className={cn(VALUE_CLASS, "text-amber-300")}>{formatMoney(titulo.valorMulta)}</p>
            </div>
          )}
          {hasValorPositivo(titulo.valorTarifa) && (
            <div>
              <span className={LABEL_CLASS}>Taxas bancárias</span>
              <p className={cn(VALUE_CLASS, "text-white/70")}>{formatMoney(titulo.valorTarifa)}</p>
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <span className={LABEL_CLASS}>Linha digitável</span>
            <p className="mt-1 break-all font-mono text-xs leading-relaxed text-white/80">
              {titulo.linhaDigitavel ?? "—"}
            </p>
          </div>
          {titulo.codigoBarras && (
            <div className="sm:col-span-2 lg:col-span-3">
              <span className={LABEL_CLASS}>Código de barras</span>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed text-white/60">
                {titulo.codigoBarras}
              </p>
            </div>
          )}
        </div>
      </div>

      {!isAtendimentoView && podeLiquidar && (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Banknote size={20} />
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">
              Liquidação manual
            </h2>
          </div>
          <div className="grid max-w-lg gap-5">
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS}>Valor pago</label>
              <InputNumber
                value={valorPago}
                onValueChange={(e) => setValorPago(e.value ?? null)}
                mode="currency"
                currency="BRL"
                locale="pt-BR"
                className="w-full"
                inputClassName="w-full border-white/10 bg-white/[0.05] p-3 text-white focus:border-blue-500/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS}>Data do pagamento</label>
              <Calendar
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.value ?? null)}
                dateFormat="dd/mm/yy"
                className="w-full"
                inputClassName="w-full border-white/10 bg-white/[0.05] p-3 text-white focus:border-blue-500/40"
                showIcon
              />
            </div>
            <ActionButton
              label="Liquidar"
              icon={<Banknote size={14} />}
              variant="primary"
              disabled={actionLoading}
              onClick={() => void liquidar()}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          <History size={18} className="text-white/40" />
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-white">
            Histórico
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            {historico.length} evento{historico.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
          <DataTable
            value={historico}
            loading={loading}
            emptyMessage="Nenhum evento registrado."
            responsiveLayout="stack"
            pt={{
              header: { className: "bg-transparent border-white/5 p-6" },
              table: { className: "bg-transparent" },
              thead: { className: "bg-white/5" },
              bodyRow: {
                className:
                  "bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors",
              },
              column: {
                headerCell: {
                  className:
                    "bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6",
                },
                bodyCell: { className: "border-white/5 py-4 px-6" },
              },
            }}
          >
            <Column
              header="Quando"
              body={(row: TituloHistoricoItem) =>
                dashboardCellText(formatDateTime(row.eventoEm))
              }
            />
            <Column
              header="De"
              body={(row: TituloHistoricoItem) =>
                row.statusAnterior
                  ? dashboardStatusBadge(row.statusAnterior, STATUS_TONES)
                  : dashboardCellText("—")
              }
            />
            <Column
              header="Para"
              body={(row: TituloHistoricoItem) =>
                dashboardStatusBadge(row.statusNovo, STATUS_TONES)
              }
            />
            <Column
              header="Usuário"
              body={(row: TituloHistoricoItem) =>
                dashboardCellText(row.usuarioNome ?? "Usuário sistema")
              }
            />
            <Column
              header="Observação"
              body={(row: TituloHistoricoItem) => dashboardCellText(row.observacao ?? "—")}
            />
          </DataTable>
        </div>
      </div>

      {!isAtendimentoView && (
        <>
          <TituloCancelarDialog
            visible={cancelDialogOpen}
            titulo={titulo}
            loading={actionLoading}
            onHide={() => setCancelDialogOpen(false)}
            onConfirm={confirmarCancelar}
          />

          <TituloRegistrarConvenioDialog
            visible={registrarDialogOpen}
            onHide={() => setRegistrarDialogOpen(false)}
            tituloResumo={tituloTitulo}
            convenioNome={titulo.convenioNome}
            onConfirm={() => void confirmarRegistrar()}
            loading={actionLoading}
          />

          <TituloLegadoManualDialog
            visible={editLegadoOpen}
            tituloId={tituloId}
            onHide={() => setEditLegadoOpen(false)}
            onCreated={(atualizado) => {
              setEditLegadoOpen(false);
              if (atualizado) {
                setTitulo(atualizado);
              }
              void load();
            }}
          />
        </>
      )}
    </div>
  );
}
