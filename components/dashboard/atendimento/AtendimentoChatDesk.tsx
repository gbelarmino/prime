"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { useConversaRealtime } from "@/hooks/use-conversa-realtime";
import {
  atendimentoChatService,
  type WhatsAppConversa,
  type WhatsAppMensagemChat,
} from "@/lib/atendimento-chat-service";

export function AtendimentoChatDesk() {
  const [conversas, setConversas] = useState<WhatsAppConversa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<WhatsAppMensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);

  const carregarConversas = useCallback(async () => {
    try {
      const list = await atendimentoChatService.listarConversas(
        filtroStatus || undefined,
      );
      setConversas(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao listar conversas");
    }
  }, [filtroStatus]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  const carregarMensagensIniciais = useCallback(
    async (id: string) => {
      try {
        const page = await atendimentoChatService.listarMensagensRecentes(id);
        setMensagens(page.itens);
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore ?? null);
        setNextBeforeId(page.nextBeforeId ?? null);
        stickToBottomRef.current = true;
        scrollToBottom();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar mensagens");
      }
    },
    [scrollToBottom],
  );

  const carregarMaisAntigas = useCallback(async () => {
    if (!selectedId || !hasMore || !nextBefore || !nextBeforeId) return;
    if (loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);

    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;

    try {
      const page = await atendimentoChatService.listarMensagensAntigas(
        selectedId,
        nextBefore,
        nextBeforeId,
      );
      setMensagens((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const older = page.itens.filter((m) => !seen.has(m.id));
        return [...older, ...prev];
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore ?? null);
      setNextBeforeId(page.nextBeforeId ?? null);
      stickToBottomRef.current = false;

      requestAnimationFrame(() => {
        if (!el) return;
        const delta = el.scrollHeight - prevHeight;
        el.scrollTop = prevTop + delta;
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar histórico");
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [selectedId, hasMore, nextBefore, nextBeforeId]);

  useEffect(() => {
    void carregarConversas();
  }, [carregarConversas]);

  useEffect(() => {
    setMensagens([]);
    setHasMore(false);
    setNextBefore(null);
    setNextBeforeId(null);
    if (selectedId) void carregarMensagensIniciais(selectedId);
  }, [selectedId, carregarMensagensIniciais]);

  /** Realtime: só atualiza a “ponta” recente sem resetar o histórico já carregado. */
  useConversaRealtime(
    useCallback(() => {
      void carregarConversas();
      if (!selectedId) return;
      void (async () => {
        try {
          const page = await atendimentoChatService.listarMensagensRecentes(selectedId);
          setMensagens((prev) => {
            if (prev.length === 0) return page.itens;
            const byId = new Map(prev.map((m) => [m.id, m]));
            for (const m of page.itens) {
              byId.set(m.id, m);
            }
            return Array.from(byId.values()).sort((a, b) => {
              const ta = a.dataCadastro ? Date.parse(a.dataCadastro) : 0;
              const tb = b.dataCadastro ? Date.parse(b.dataCadastro) : 0;
              if (ta !== tb) return ta - tb;
              return a.id.localeCompare(b.id);
            });
          });
          if (stickToBottomRef.current) scrollToBottom();
        } catch {
          /* ignore */
        }
      })();
    }, [carregarConversas, selectedId, scrollToBottom]),
  );

  function onThreadScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
    if (el.scrollTop < 60 && hasMore && !loadingOlderRef.current) {
      void carregarMaisAntigas();
    }
  }

  async function enviar() {
    if (!selectedId || !texto.trim()) return;
    setLoading(true);
    setErro(null);
    try {
      const msg = await atendimentoChatService.responder(selectedId, texto.trim());
      setTexto("");
      setMensagens((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      stickToBottomRef.current = true;
      scrollToBottom();
      await carregarConversas();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  }

  async function marcarResolvida() {
    if (!selectedId) return;
    await atendimentoChatService.atualizar(selectedId, { status: "RESOLVIDA" });
    await carregarConversas();
  }

  const selected = conversas.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[480px] flex-col gap-3 px-4">
      {erro ? (
        <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {erro}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todas</option>
          <option value="ABERTA">Abertas</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="RESOLVIDA">Resolvidas</option>
        </select>
        <Button
          label="Atualizar"
          size="small"
          outlined
          onClick={() => void carregarConversas()}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_240px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Conversas
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {conversas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-3 py-2.5 text-left transition ${
                    selectedId === c.id ? "bg-blue-500/20" : "hover:bg-white/5"
                  }`}
                >
                  <span className="font-mono text-sm text-white">{c.telefone}</span>
                  <span className="text-[11px] text-white/40">
                    {c.status}
                    {(c.naoLidas ?? 0) > 0 ? ` · ${c.naoLidas} nova(s)` : ""}
                  </span>
                </button>
              </li>
            ))}
            {conversas.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-white/30">
                Nenhuma conversa
              </li>
            ) : null}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-sm text-white/80">
              {selected ? selected.telefone : "Selecione uma conversa"}
            </span>
            {selected ? (
              <Button
                label="Resolver"
                size="small"
                text
                onClick={() => void marcarResolvida()}
              />
            ) : null}
          </div>
          <div
            ref={scrollRef}
            onScroll={onThreadScroll}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
          >
            {loadingOlder ? (
              <div className="py-2 text-center text-[11px] text-white/40">
                Carregando mensagens anteriores…
              </div>
            ) : hasMore ? (
              <div className="py-1 text-center text-[10px] text-white/25">
                Role para cima para ver mais
              </div>
            ) : mensagens.length > 0 ? (
              <div className="py-1 text-center text-[10px] text-white/20">
                Início da conversa
              </div>
            ) : null}

            {mensagens.map((m) => {
              const out = m.direcao === "OUT";
              return (
                <div
                  key={m.id}
                  className={`flex ${out ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      out
                        ? "bg-blue-600/80 text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.corpo}</div>
                    <div className="mt-1 text-[10px] opacity-50">
                      {m.autor}
                      {m.dataCadastro
                        ? ` · ${new Date(m.dataCadastro).toLocaleString("pt-BR")}`
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 border-t border-white/10 p-3">
            <InputTextarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              className="w-full"
              placeholder={
                selected
                  ? "Escreva a resposta (janela 24h)…"
                  : "Selecione uma conversa"
              }
              disabled={!selected || loading}
            />
            <Button
              icon="pi pi-send"
              onClick={() => void enviar()}
              disabled={!selected || loading || !texto.trim()}
              loading={loading}
            />
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 lg:flex">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Contexto
          </div>
          {selected ? (
            <dl className="space-y-2 text-sm text-white/70">
              <div>
                <dt className="text-white/40">Telefone</dt>
                <dd className="font-mono">{selected.telefone}</dd>
              </div>
              <div>
                <dt className="text-white/40">Status</dt>
                <dd>{selected.status}</dd>
              </div>
              <div>
                <dt className="text-white/40">Cliente</dt>
                <dd>{selected.clienteId ?? "—"}</dd>
              </div>
              <p className="pt-4 text-xs text-white/35">
                Fora da janela de 24h, use templates Meta aprovados (Content SID)
                cadastrados em WhatsApp → Modelos.
              </p>
            </dl>
          ) : (
            <p className="text-sm text-white/30">Sem conversa selecionada.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
