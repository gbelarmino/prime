"use client";

import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { dashboardStatusBadge } from "@/lib/dashboard-datatable";
import {
  formatContratoRef,
  formatTituloParcelaLabel,
  type TituloCobranca,
  type TituloSmsNotificacao,
} from "@/lib/fin-service";
import { formatBusinessDateTimeWithSeconds } from "@/lib/format-datetime";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { SMS_FILA_STATUS_TONES, smsFilaStatusLabel } from "@/lib/sms-fila-status";
import { cn } from "@/lib/utils";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

type TituloSmsNotificacoesDialogProps = {
  visible: boolean;
  onHide: () => void;
  titulo: TituloCobranca | null;
  notificacoes: TituloSmsNotificacao[];
  loading?: boolean;
  error?: string | null;
};

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="m-0 break-words text-sm text-white/85">{value}</p>
    </div>
  );
}

function NotificacaoCard({ item }: { item: TituloSmsNotificacao }) {
  const enviadoEm = item.dataEnvio ?? item.dataAgendada;
  const textBeeId = item.externalSmsId?.trim() || item.externalId?.trim() || null;

  return (
    <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {dashboardStatusBadge(smsFilaStatusLabel(item.status), SMS_FILA_STATUS_TONES, item.status)}
          <span className="font-mono text-[11px] tabular-nums text-white/45">#{item.id}</span>
        </div>
        <span className="text-[11px] text-white/50">
          {enviadoEm ? formatBusinessDateTimeWithSeconds(enviadoEm) : "—"}
        </span>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <MetaItem label="Telefone" value={formatPhoneDisplay(item.telefone) || item.telefone || "—"} />
        <MetaItem
          label="Tentativas"
          value={String(item.tentativas ?? 0)}
        />
        {textBeeId ? <MetaItem label="ID TextBee" value={textBeeId} /> : null}
        <MetaItem
          label="Enfileirado em"
          value={
            item.dataCriacao ? formatBusinessDateTimeWithSeconds(item.dataCriacao) : "—"
          }
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Mensagem</p>
        <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
          {item.mensagem?.trim() || "—"}
        </p>
      </div>

      {item.erro?.trim() ? (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300/55">Erro</p>
          <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-rose-200/90">
            {item.erro}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function TituloSmsNotificacoesDialog({
  visible,
  onHide,
  titulo,
  notificacoes,
  loading = false,
  error = null,
}: TituloSmsNotificacoesDialogProps) {
  const resumo = titulo
    ? `${formatContratoRef(titulo.numeroContrato, titulo.contratoId)} · parc. ${formatTituloParcelaLabel(titulo)} · ${titulo.nossoNumero}`
    : null;

  return (
    <DashboardDialog
      header="Notificações SMS"
      visible={visible}
      onHide={onHide}
      className={cn("w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl")}
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:bg-white/[0.08]"
          >
            Fechar
          </button>
        </div>
      }
    >
      {resumo ? (
        <p className="mb-5 text-sm text-white/55">{resumo}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/50">Carregando notificações…</p>
      ) : error ? (
        <p className="text-sm text-rose-300/90">{error}</p>
      ) : notificacoes.length === 0 ? (
        <p className="text-sm text-white/50">Nenhuma notificação SMS registrada para este título.</p>
      ) : (
        <div className="flex max-h-[min(28rem,60vh)] flex-col gap-3 overflow-y-auto pr-1">
          {notificacoes.map((item) => (
            <NotificacaoCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </DashboardDialog>
  );
}
