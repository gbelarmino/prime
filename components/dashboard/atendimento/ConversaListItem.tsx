"use client";

import type { WhatsAppConversa } from "@/lib/atendimento-chat-service";
import { janelaBadgeClass, janelaBadgeLabel, segundosAte } from "@/lib/whatsapp-janela";
import {
  formatHoraRelativaLista,
  iniciaisTitulo,
  janelaAvatarRingClass,
} from "@/lib/whatsapp-desk-ui";
import { cn } from "@/lib/utils";

type Props = {
  conversa: WhatsAppConversa;
  selected: boolean;
  flash: boolean;
  nowMs: number;
  onSelect: () => void;
};

export function ConversaListItem({ conversa: c, selected, flash, nowMs, onSelect }: Props) {
  const titulo = c.tituloExibicao || c.clienteNome || c.telefone;
  const unread = c.naoLidas ?? 0;
  const restante = c.janelaExpiraEm
    ? segundosAte(c.janelaExpiraEm, nowMs)
    : (c.janelaRestanteSegundos ?? 0);
  const hora = formatHoraRelativaLista(c.dataUltimaMensagem, nowMs);
  const preview = c.ultimaMensagemPreview?.trim() || "Sem mensagens";
  const fechando = (c.janelaEstado ?? "").toUpperCase() === "FECHANDO";

  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-2.5 border-b border-white/5 px-3 py-2.5 text-left transition-colors",
          selected ? "bg-[var(--wa-desk-selected)]" : "hover:bg-[var(--wa-desk-surface-hover)]",
          fechando && "border-l-2 border-l-amber-400/80",
          flash && "bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold tracking-wide text-white/80",
            janelaAvatarRingClass(c.janelaEstado),
          )}
          aria-hidden
        >
          {iniciaisTitulo(titulo)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm text-white",
                unread > 0 ? "font-semibold" : "font-medium text-white/90",
              )}
            >
              {titulo}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-white/40">{hora}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] text-[var(--wa-desk-preview)]">{preview}</span>
            {unread > 0 ? (
              <span
                className="wa-desk__unread-pill inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                aria-label={`${unread} não lidas`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${janelaBadgeClass(c.janelaEstado)}`}
            >
              {janelaBadgeLabel(c.janelaEstado, restante)}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}
