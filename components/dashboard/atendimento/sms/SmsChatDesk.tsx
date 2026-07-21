"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { useConversaRealtime } from "@/hooks/use-conversa-realtime";
import {
  smsAtendimentoChatService,
  type SmsConversa,
  type SmsMensagem,
} from "@/lib/sms-atendimento-chat-service";
import { WHATSAPP_INBOUND_ALERT_EVENT } from "@/lib/whatsapp-inbound-alert";
import { WhatsAppDeliveryTicks } from "@/lib/whatsapp-message-ticks";
import { SmsInboxColumn } from "./SmsInboxColumn";
import { SmsComposer } from "./SmsComposer";
import { NovaSmsConversaDialog } from "./NovaSmsConversaDialog";

export function SmsChatDesk() {
  const searchParams = useSearchParams();
  const [conversas, setConversas] = useState<SmsConversa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashConversaId, setFlashConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<SmsMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingConversas, setLoadingConversas] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [listNow, setListNow] = useState(() => Date.now());
  const [contextoAberto, setContextoAberto] = useState(false);
  const [novaConversaOpen, setNovaConversaOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const marcarLidaInFlightRef = useRef<string | null>(null);

  const selected = conversas.find((c) => c.id === selectedId);

  useEffect(() => {
    const id = window.setInterval(() => setListNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const carregarConversas = useCallback(async () => {
    setLoadingConversas(true);
    try {
      const list = await smsAtendimentoChatService.listarConversas(
        filtroStatus || undefined,
      );
      setConversas(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao listar conversas");
    } finally {
      setLoadingConversas(false);
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
      setLoadingThread(true);
      setErro(null);
      try {
        const page = await smsAtendimentoChatService.listarMensagensRecentes(id);
        setMensagens(page.itens);
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore ?? null);
        setNextBeforeId(page.nextBeforeId ?? null);
        stickToBottomRef.current = true;
        scrollToBottom();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar mensagens");
      } finally {
        setLoadingThread(false);
      }
    },
    [scrollToBottom],
  );

  const carregarMaisAntigas = useCallback(async () => {
    if (
      !selectedId ||
      !hasMore ||
      !nextBefore ||
      !nextBeforeId ||
      loadingOlderRef.current
    ) {
      return;
    }
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await smsAtendimentoChatService.listarMensagensAntigas(
        selectedId,
        nextBefore,
        nextBeforeId,
      );
      setMensagens((prev) => {
        const byId = new Map(page.itens.map((m) => [m.id, m]));
        for (const m of prev) byId.set(m.id, m);
        return Array.from(byId.values()).sort((a, b) => {
          const ta = a.dataCadastro ? Date.parse(a.dataCadastro) : 0;
          const tb = b.dataCadastro ? Date.parse(b.dataCadastro) : 0;
          if (ta !== tb) return ta - tb;
          return a.id.localeCompare(b.id);
        });
      });
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore ?? null);
      setNextBeforeId(page.nextBeforeId ?? null);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
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
    const id = searchParams.get("conversa");
    if (id) setSelectedId(id);
  }, [searchParams]);

  useEffect(() => {
    const onInboundFlash = (e: Event) => {
      const detail = (e as CustomEvent<{ conversaId?: string | null; canal?: string }>)
        .detail;
      if ((detail?.canal ?? "WHATSAPP").toUpperCase() !== "SMS") return;
      setFlashConversaId(detail?.conversaId ?? null);
      window.setTimeout(() => setFlashConversaId(null), 1800);
    };
    window.addEventListener(WHATSAPP_INBOUND_ALERT_EVENT, onInboundFlash);
    return () =>
      window.removeEventListener(WHATSAPP_INBOUND_ALERT_EVENT, onInboundFlash);
  }, []);

  useEffect(() => {
    setMensagens([]);
    setHasMore(false);
    setNextBefore(null);
    setNextBeforeId(null);
    setTexto("");
    if (selectedId) void carregarMensagensIniciais(selectedId);
  }, [selectedId, carregarMensagensIniciais]);

  useEffect(() => {
    if (!selectedId) return;
    const conv = conversas.find((c) => c.id === selectedId);
    if (!conv || (conv.naoLidas ?? 0) <= 0) return;
    if (marcarLidaInFlightRef.current === selectedId) return;
    marcarLidaInFlightRef.current = selectedId;
    setConversas((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, naoLidas: 0 } : c)),
    );
    void smsAtendimentoChatService
      .marcarLida(selectedId)
      .catch(() => undefined)
      .finally(() => {
        if (marcarLidaInFlightRef.current === selectedId) {
          marcarLidaInFlightRef.current = null;
        }
      });
  }, [selectedId, conversas]);

  const onRealtimeMessage = useCallback(
    (msg: {
      type?: string;
      mensagemId?: unknown;
      status?: unknown;
      conversaId?: unknown;
    }) => {
      if (msg.type !== "MSG_STATUS") return;
      const mensagemId =
        typeof msg.mensagemId === "string" ? msg.mensagemId : null;
      const status = typeof msg.status === "string" ? msg.status : null;
      if (!mensagemId || !status) return;
      setMensagens((prev) =>
        prev.map((m) => (m.id === mensagemId ? { ...m, status } : m)),
      );
    },
    [],
  );

  useConversaRealtime(
    useCallback(() => {
      void carregarConversas();
      if (!selectedId) return;
      void (async () => {
        try {
          const page =
            await smsAtendimentoChatService.listarMensagensRecentes(selectedId);
          setMensagens((prev) => {
            if (prev.length === 0) return page.itens;
            const byId = new Map(prev.map((m) => [m.id, m]));
            for (const m of page.itens) byId.set(m.id, m);
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
    { onMessage: onRealtimeMessage, canal: "SMS" },
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

  function selectConversa(id: string) {
    marcarLidaInFlightRef.current = null;
    setSelectedId(id);
  }

  async function enviar() {
    if (!selectedId || !texto.trim()) return;
    setLoading(true);
    setErro(null);
    try {
      const msg = await smsAtendimentoChatService.responder(
        selectedId,
        texto.trim(),
      );
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
    await smsAtendimentoChatService.atualizar(selectedId, {
      status: "RESOLVIDA",
    });
    await carregarConversas();
  }

  async function iniciarNovaConversa(args: {
    contratanteId?: number;
    telefone: string;
    mensagem?: string;
  }) {
    setErro(null);
    const result = await smsAtendimentoChatService.iniciarConversa({
      contratanteId: args.contratanteId,
      telefone: args.telefone,
      mensagem: args.mensagem,
    });
    await carregarConversas();
    setSelectedId(result.conversa.id);
  }

  return (
    <div className="wa-desk flex flex-col gap-2 px-4">
      <NovaSmsConversaDialog
        visible={novaConversaOpen}
        onHide={() => setNovaConversaOpen(false)}
        onEnviar={iniciarNovaConversa}
      />
      {erro ? (
        <div className="shrink-0 rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {erro}
        </div>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-2 transition-[grid-template-columns] duration-300 ease-out ${
          contextoAberto
            ? "lg:grid-cols-[300px_minmax(0,1fr)_240px]"
            : "lg:grid-cols-[300px_minmax(0,1fr)_44px]"
        }`}
      >
        <SmsInboxColumn
          conversas={conversas}
          selectedId={selectedId}
          flashConversaId={flashConversaId}
          loading={loadingConversas}
          filtroStatus={filtroStatus}
          onFiltroStatus={setFiltroStatus}
          onRefresh={() => void carregarConversas()}
          onSelect={selectConversa}
          onNovaConversa={() => setNovaConversaOpen(true)}
          listNow={listNow}
        />

        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-[var(--wa-desk-surface)] transition-[box-shadow,border-color,opacity] duration-300 ${
            flashConversaId && selectedId === flashConversaId
              ? "border-sky-400/60 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
              : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white/90">
                {selected
                  ? selected.tituloExibicao ||
                    selected.clienteNome ||
                    selected.telefone
                  : "Selecione uma conversa"}
              </div>
              {selected ? (
                <div className="truncate font-mono text-[11px] text-white/40">
                  {selected.telefone}
                  <span className="ml-2 text-sky-300/70">SMS</span>
                </div>
              ) : null}
            </div>
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
            className="relative min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
          >
            {loadingThread ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0b1220]/40">
                <span
                  className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/65"
                  aria-label="A carregar mensagens"
                />
              </div>
            ) : null}
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
              const when = m.dataCadastro ? new Date(m.dataCadastro) : null;
              const timeLabel = when
                ? when.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const fullWhen = when ? when.toLocaleString("pt-BR") : "";
              return (
                <div
                  key={m.id}
                  id={`sms-msg-${m.id}`}
                  className={`flex ${out ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      out
                        ? "bg-sky-600/80 text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    {m.corpo ? (
                      <div className="whitespace-pre-wrap">{m.corpo}</div>
                    ) : null}
                    {m.erro ? (
                      <div className="mt-1 text-[11px] text-red-200/90">{m.erro}</div>
                    ) : null}
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] opacity-60 ${
                        out ? "justify-end" : "justify-start"
                      }`}
                      title={fullWhen || undefined}
                    >
                      {!out && m.autor ? (
                        <span className="mr-0.5 truncate opacity-80">
                          {m.autor}
                        </span>
                      ) : null}
                      {timeLabel ? <span>{timeLabel}</span> : null}
                      {out ? (
                        <WhatsAppDeliveryTicks status={m.status} />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <SmsComposer
            disabled={!selected || loading}
            texto={texto}
            onTexto={setTexto}
            onEnviar={() => void enviar()}
            loading={loading}
            hasSelected={!!selected}
          />
        </section>

        <aside
          className={`relative hidden min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--wa-desk-surface)] transition-[width] duration-300 ease-out lg:flex ${
            contextoAberto ? "p-3" : "items-center px-0 py-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setContextoAberto((v) => !v)}
            className={`flex shrink-0 items-center gap-1.5 text-white/50 transition-colors hover:text-white ${
              contextoAberto
                ? "mb-2 w-full justify-between text-xs font-semibold uppercase tracking-wider"
                : "h-full w-full flex-col justify-start gap-3 pt-1"
            }`}
            title={contextoAberto ? "Recolher contexto" : "Expandir contexto"}
            aria-expanded={contextoAberto}
            aria-label={
              contextoAberto ? "Recolher contexto" : "Expandir contexto"
            }
          >
            {contextoAberto ? (
              <>
                <span>Contexto</span>
                <i className="pi pi-angle-right text-sm" />
              </>
            ) : (
              <>
                <i className="pi pi-angle-left text-sm" />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  Contexto
                </span>
              </>
            )}
          </button>
          {contextoAberto ? (
            selected ? (
              <dl className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm text-white/70">
                <div>
                  <dt className="text-white/40">Telefone</dt>
                  <dd className="font-mono">{selected.telefone}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Canal</dt>
                  <dd className="text-sky-300/90">SMS</dd>
                </div>
                <div>
                  <dt className="text-white/40">Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Cliente</dt>
                  <dd>
                    {selected.clienteNome || selected.tituloExibicao ? (
                      <span>
                        {selected.clienteNome || selected.tituloExibicao}
                        {selected.contratanteId != null ? (
                          <>
                            {" "}
                            <a
                              href={`/dashboard/clientes/edit?id=${selected.contratanteId}`}
                              className="text-sky-300/90 hover:underline"
                            >
                              #{selected.contratanteId}
                            </a>
                          </>
                        ) : null}
                      </span>
                    ) : selected.contratanteId != null ? (
                      <a
                        href={`/dashboard/clientes/edit?id=${selected.contratanteId}`}
                        className="text-sky-300/90 hover:underline"
                      >
                        Cliente #{selected.contratanteId}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <p className="pt-4 text-xs text-white/35">
                  SMS permite texto livre a qualquer momento — sem janela 24h nem
                  templates Meta.
                </p>
              </dl>
            ) : (
              <p className="text-sm text-white/30">Sem conversa selecionada.</p>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}
