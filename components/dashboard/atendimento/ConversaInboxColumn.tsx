"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import type { WhatsAppConversa } from "@/lib/atendimento-chat-service";
import { ConversaListItem } from "./ConversaListItem";
import { cn } from "@/lib/utils";

type Props = {
  conversas: WhatsAppConversa[];
  selectedId: string | null;
  flashConversaId: string | null;
  loading: boolean;
  filtroStatus: string;
  onFiltroStatus: (v: string) => void;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  onNovaConversa: () => void;
  listNow: number;
};

export function ConversaInboxColumn({
  conversas,
  selectedId,
  flashConversaId,
  loading,
  filtroStatus,
  onFiltroStatus,
  onRefresh,
  onSelect,
  onNovaConversa,
  listNow,
}: Props) {
  const [busca, setBusca] = useState("");
  const [soNaoLidas, setSoNaoLidas] = useState(false);
  const buscaDeferred = useDeferredValue(busca.trim().toLowerCase());

  const filtradas = useMemo(() => {
    let list = conversas;
    if (soNaoLidas) {
      list = list.filter((c) => (c.naoLidas ?? 0) > 0);
    }
    if (buscaDeferred) {
      list = list.filter((c) => {
        const hay = [
          c.tituloExibicao,
          c.clienteNome,
          c.telefone,
          c.empreendimento,
          c.ultimaMensagemPreview,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(buscaDeferred);
      });
    }
    return list;
  }, [conversas, soNaoLidas, buscaDeferred]);

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--wa-desk-surface)]">
      <div className="space-y-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Inbox
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNovaConversa}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-950/30 px-2 py-1 text-[10px] font-medium text-emerald-200/90 transition-colors hover:border-emerald-400/50 hover:bg-emerald-900/40"
              title="Iniciar conversa com template"
            >
              <i className="pi pi-plus text-[9px]" />
              Nova
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="text-white/40 transition-colors hover:text-white"
              title="Atualizar"
              aria-label="Atualizar conversas"
            >
              {loading ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-white/20 border-t-white/70" />
              ) : (
                <i className="pi pi-refresh text-xs" />
              )}
            </button>
          </div>
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome ou telefone…"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-blue-400/40 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={!soNaoLidas && !filtroStatus}
            onClick={() => {
              setSoNaoLidas(false);
              onFiltroStatus("");
            }}
          >
            Todas
          </Chip>
          <Chip
            active={soNaoLidas}
            onClick={() => {
              setSoNaoLidas(true);
              onFiltroStatus("");
            }}
          >
            Não lidas
          </Chip>
          {(
            [
              ["ABERTA", "Abertas"],
              ["PENDENTE", "Pendentes"],
              ["RESOLVIDA", "Resolvidas"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              active={!soNaoLidas && filtroStatus === value}
              onClick={() => {
                setSoNaoLidas(false);
                onFiltroStatus(value);
              }}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <ul role="listbox" aria-label="Conversas" className="min-h-0 flex-1 overflow-y-auto">
        {loading && conversas.length === 0 ? (
          <li className="flex items-center justify-center px-3 py-10">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/60"
              aria-label="A carregar"
            />
          </li>
        ) : null}
        {filtradas.map((c) => (
          <ConversaListItem
            key={c.id}
            conversa={c}
            selected={selectedId === c.id}
            flash={flashConversaId === c.id}
            nowMs={listNow}
            onSelect={() => onSelect(c.id)}
          />
        ))}
        {!loading && filtradas.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-white/30">
            {buscaDeferred || soNaoLidas ? "Nenhum resultado" : "Nenhuma conversa"}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-blue-500/25 text-blue-200 ring-1 ring-blue-400/40"
          : "bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70",
      )}
    >
      {children}
    </button>
  );
}
