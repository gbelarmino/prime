"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { useConversaRealtime } from "@/hooks/use-conversa-realtime";
import {
  atendimentoChatService,
  type WhatsAppConversa,
  type WhatsAppMensagemChat,
  type WhatsAppMensagemReplyTo,
  type WhatsAppTemplateAprovado,
} from "@/lib/atendimento-chat-service";
import {
  janelaHeaderText,
  janelaPodeTextoLivre,
  segundosAte,
} from "@/lib/whatsapp-janela";
import { requestTwilioSaldoRefresh } from "@/lib/twilio-saldo-events";
import { WHATSAPP_INBOUND_ALERT_EVENT } from "@/lib/whatsapp-inbound-alert";
import { WhatsAppDeliveryTicks } from "@/lib/whatsapp-message-ticks";
import { ConversaInboxColumn } from "./ConversaInboxColumn";
import { ChatComposer } from "./ChatComposer";

const TEMPLATE_HINT =
  "Fora da janela de 24h, use templates Meta aprovados (Content SID) cadastrados em WhatsApp → Modelos.";

function useJanelaTick(expiraEm: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiraEm) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiraEm]);
  return segundosAte(expiraEm, now);
}

function replyPreviewLabel(r: WhatsAppMensagemReplyTo): string {
  const corpo = r.corpo?.trim();
  if (corpo) return corpo;
  const kind = (r.mediaKind ?? "").toUpperCase();
  if (kind === "IMAGE") return "Imagem";
  if (kind === "AUDIO") return "Áudio";
  if (kind) return "Documento";
  return "Mensagem";
}

function replyAuthorLabel(r: WhatsAppMensagemReplyTo, bubbleOut: boolean): string {
  if (r.direcao === "OUT") return bubbleOut ? "Você" : "Agente";
  if (r.autor === "CLIENTE") return "Cliente";
  return r.autor?.trim() || "Mensagem";
}

function MensagemQuote({
  replyTo,
  out,
}: {
  replyTo: WhatsAppMensagemReplyTo;
  out: boolean;
}) {
  return (
    <div
      className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-[11px] ${
        out
          ? "border-white/50 bg-black/20 text-white/80"
          : "border-emerald-400/70 bg-black/25 text-white/70"
      }`}
    >
      <div className={`font-medium ${out ? "text-white/90" : "text-emerald-300/90"}`}>
        {replyAuthorLabel(replyTo, out)}
      </div>
      <div className="line-clamp-2 opacity-80">{replyPreviewLabel(replyTo)}</div>
    </div>
  );
}

function toReplyDraft(m: WhatsAppMensagemChat): WhatsAppMensagemReplyTo {
  return {
    id: m.id,
    corpo: m.corpo,
    autor: m.autor,
    direcao: m.direcao,
    mediaKind: m.mediaKind,
  };
}

function MensagemAnexo({ m }: { m: WhatsAppMensagemChat }) {
  if (!m.mediaUrl && !m.mediaNomeArquivo) return null;
  const kind = (m.mediaKind ?? "").toUpperCase();
  const ct = m.mediaContentType ?? "";
  const isImage = kind === "IMAGE" || ct.startsWith("image/");
  const isAudio = kind === "AUDIO" || ct.startsWith("audio/");
  if (isImage && m.mediaUrl) {
    return (
      <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.mediaUrl}
          alt={m.mediaNomeArquivo || "Imagem"}
          className="max-h-56 max-w-full rounded-lg object-contain"
        />
      </a>
    );
  }
  if (isAudio && m.mediaUrl) {
    return (
      <div className="mt-1 min-w-[200px]">
        <audio controls preload="metadata" className="w-full max-w-xs">
          <source src={m.mediaUrl} type={ct || undefined} />
        </audio>
        {m.mediaNomeArquivo ? (
          <div className="mt-1 truncate text-[10px] opacity-60">{m.mediaNomeArquivo}</div>
        ) : null}
      </div>
    );
  }
  return (
    <a
      href={m.mediaUrl || "#"}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-2 text-xs underline-offset-2 hover:underline"
    >
      <i className="pi pi-file text-sm opacity-80" />
      <span className="truncate">{m.mediaNomeArquivo || "Documento"}</span>
    </a>
  );
}

export function AtendimentoChatDesk() {
  const searchParams = useSearchParams();
  const [conversas, setConversas] = useState<WhatsAppConversa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashConversaId, setFlashConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<WhatsAppMensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [anexoPreviewUrl, setAnexoPreviewUrl] = useState<string | null>(null);
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
  const [templates, setTemplates] = useState<WhatsAppTemplateAprovado[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [enviandoTemplate, setEnviandoTemplate] = useState(false);
  const [replyTo, setReplyTo] = useState<WhatsAppMensagemReplyTo | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const marcarLidaInFlightRef = useRef<string | null>(null);

  const selected = conversas.find((c) => c.id === selectedId);
  const restanteSelected = useJanelaTick(selected?.janelaExpiraEm);
  const estadoSelectedRaw = (selected?.janelaEstado ?? "SEM_INBOUND").toUpperCase();
  const estadoSelected =
    selected?.janelaExpiraEm && restanteSelected <= 0 && estadoSelectedRaw !== "SEM_INBOUND"
      ? "FECHADA"
      : estadoSelectedRaw;
  const podeTextoLivre = janelaPodeTextoLivre(estadoSelected);

  useEffect(() => {
    const id = window.setInterval(() => setListNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const list = await atendimentoChatService.listarTemplatesAprovados();
        setTemplates(list);
        setTemplateId((prev) => {
          if (prev && list.some((t) => t.templateId === prev)) return prev;
          const boas = list.find((t) => t.nome === "mensagem_de_boas_vindas");
          return boas?.templateId ?? list[0]?.templateId ?? "";
        });
      } catch {
        setTemplates([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!anexo || !anexo.type.startsWith("image/")) {
      setAnexoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(anexo);
    setAnexoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [anexo]);

  function limparAnexo() {
    setAnexo(null);
  }

  const carregarConversas = useCallback(async () => {
    setLoadingConversas(true);
    try {
      const list = await atendimentoChatService.listarConversas(
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
        const page = await atendimentoChatService.listarMensagensRecentes(id);
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
    if (!selectedId || !hasMore || !nextBefore || !nextBeforeId || loadingOlderRef.current)
      return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await atendimentoChatService.listarMensagensAntigas(
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
      const conversaId =
        (e as CustomEvent<{ conversaId?: string | null }>).detail?.conversaId ?? null;
      setFlashConversaId(conversaId);
      window.setTimeout(() => setFlashConversaId(null), 1800);
    };
    window.addEventListener(WHATSAPP_INBOUND_ALERT_EVENT, onInboundFlash);
    return () => window.removeEventListener(WHATSAPP_INBOUND_ALERT_EVENT, onInboundFlash);
  }, []);

  useEffect(() => {
    setMensagens([]);
    setHasMore(false);
    setNextBefore(null);
    setNextBeforeId(null);
    setTexto("");
    setReplyTo(null);
    limparAnexo();
    if (selectedId) void carregarMensagensIniciais(selectedId);
  }, [selectedId, carregarMensagensIniciais]);

  /** Marcar lida ao abrir / quando chegam novas com a thread aberta. */
  useEffect(() => {
    if (!selectedId) return;
    const conv = conversas.find((c) => c.id === selectedId);
    if (!conv || (conv.naoLidas ?? 0) <= 0) return;
    if (marcarLidaInFlightRef.current === selectedId) return;
    marcarLidaInFlightRef.current = selectedId;
    setConversas((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, naoLidas: 0 } : c)),
    );
    void atendimentoChatService
      .marcarLida(selectedId)
      .catch(() => undefined)
      .finally(() => {
        if (marcarLidaInFlightRef.current === selectedId) {
          marcarLidaInFlightRef.current = null;
        }
      });
  }, [selectedId, conversas]);

  const onRealtimeMessage = useCallback(
    (msg: { type?: string; mensagemId?: unknown; status?: unknown; conversaId?: unknown }) => {
      if (msg.type !== "MSG_STATUS") return;
      const mensagemId = typeof msg.mensagemId === "string" ? msg.mensagemId : null;
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
    { onMessage: onRealtimeMessage },
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
    setReplyTo(null);
    setSelectedId(id);
  }

  async function enviar() {
    if (!selectedId || !podeTextoLivre) return;
    if (!texto.trim() && !anexo) return;
    setLoading(true);
    setErro(null);
    const replyId = replyTo?.id ?? null;
    try {
      const msg = anexo
        ? await atendimentoChatService.responderAnexo(
            selectedId,
            anexo,
            texto.trim() || undefined,
            replyId,
          )
        : await atendimentoChatService.responder(selectedId, texto.trim(), replyId);
      setTexto("");
      limparAnexo();
      setReplyTo(null);
      setMensagens((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      stickToBottomRef.current = true;
      scrollToBottom();
      await carregarConversas();
      requestTwilioSaldoRefresh();
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

  async function enviarTemplate() {
    if (!selectedId || !templateId) return;
    setEnviandoTemplate(true);
    setErro(null);
    try {
      const msg = await atendimentoChatService.responderTemplate(selectedId, templateId);
      setMensagens((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      stickToBottomRef.current = true;
      scrollToBottom();
      await carregarConversas();
      requestTwilioSaldoRefresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar template");
    } finally {
      setEnviandoTemplate(false);
    }
  }

  return (
    <div className="wa-desk flex flex-col gap-2 px-4">
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
        <ConversaInboxColumn
          conversas={conversas}
          selectedId={selectedId}
          flashConversaId={flashConversaId}
          loading={loadingConversas}
          filtroStatus={filtroStatus}
          onFiltroStatus={setFiltroStatus}
          onRefresh={() => void carregarConversas()}
          onSelect={selectConversa}
          listNow={listNow}
        />

        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-[var(--wa-desk-surface)] transition-[box-shadow,border-color,opacity] duration-300 ${
            flashConversaId && selectedId === flashConversaId
              ? "border-emerald-400/60 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
              : "border-white/10"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white/90">
                {selected
                  ? selected.tituloExibicao || selected.clienteNome || selected.telefone
                  : "Selecione uma conversa"}
              </div>
              {selected ? (
                <>
                  <div className="truncate font-mono text-[11px] text-white/40">
                    {selected.telefone}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] ${
                      estadoSelected === "FECHANDO"
                        ? "text-amber-300"
                        : estadoSelected === "ABERTA"
                          ? "text-emerald-300/90"
                          : "text-white/40"
                    }`}
                  >
                    {janelaHeaderText(estadoSelected, restanteSelected)}
                  </div>
                </>
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
                ? when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : "";
              const fullWhen = when ? when.toLocaleString("pt-BR") : "";
              return (
                <div
                  key={m.id}
                  id={`wa-msg-${m.id}`}
                  className={`group flex ${out ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      out
                        ? "bg-blue-600/80 text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    {podeTextoLivre ? (
                      <button
                        type="button"
                        className={`absolute -top-2 rounded-full border border-white/15 bg-[#0b1220] p-1 text-white/55 opacity-0 shadow transition-opacity hover:text-white group-hover:opacity-100 ${
                          out ? "-left-2" : "-right-2"
                        }`}
                        title="Responder"
                        aria-label="Responder a esta mensagem"
                        onClick={() => setReplyTo(toReplyDraft(m))}
                      >
                        <i className="pi pi-reply text-[10px]" />
                      </button>
                    ) : null}
                    {m.replyTo ? <MensagemQuote replyTo={m.replyTo} out={out} /> : null}
                    <MensagemAnexo m={m} />
                    {m.corpo ? (
                      <div className="whitespace-pre-wrap">{m.corpo}</div>
                    ) : null}
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] opacity-60 ${
                        out ? "justify-end" : "justify-start"
                      }`}
                      title={fullWhen || undefined}
                    >
                      {!out && m.autor ? (
                        <span className="mr-0.5 truncate opacity-80">{m.autor}</span>
                      ) : null}
                      {timeLabel ? <span>{timeLabel}</span> : null}
                      {out ? <WhatsAppDeliveryTicks status={m.status} /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <ChatComposer
            disabled={!selected || loading}
            podeTextoLivre={podeTextoLivre}
            janelaFechando={estadoSelected === "FECHANDO"}
            texto={texto}
            onTexto={setTexto}
            anexo={anexo}
            anexoPreviewUrl={anexoPreviewUrl}
            onEscolherArquivo={(files) => setAnexo(files?.[0] ?? null)}
            onLimparAnexo={limparAnexo}
            onEnviar={() => void enviar()}
            loading={loading}
            templates={templates}
            templateId={templateId}
            onTemplateId={setTemplateId}
            onEnviarTemplate={() => void enviarTemplate()}
            enviandoTemplate={enviandoTemplate}
            hasSelected={!!selected}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
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
            aria-label={contextoAberto ? "Recolher contexto" : "Expandir contexto"}
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
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
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
                  <dt className="text-white/40">Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Janela 24h</dt>
                  <dd
                    className={
                      estadoSelected === "FECHANDO"
                        ? "text-amber-300"
                        : estadoSelected === "ABERTA"
                          ? "text-emerald-300"
                          : "text-white/50"
                    }
                  >
                    {janelaHeaderText(estadoSelected, restanteSelected)}
                  </dd>
                </div>
                {(selected.empreendimento || selected.quadra || selected.lote != null) && (
                  <div>
                    <dt className="text-white/40">Imóvel</dt>
                    <dd>
                      {[
                        selected.empreendimento,
                        selected.quadra ? `Q${selected.quadra}` : null,
                        selected.lote != null ? `L${selected.lote}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </dd>
                  </div>
                )}
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
                              className="text-blue-300/90 hover:underline"
                            >
                              #{selected.contratanteId}
                            </a>
                          </>
                        ) : null}
                      </span>
                    ) : selected.contratanteId != null ? (
                      <a
                        href={`/dashboard/clientes/edit?id=${selected.contratanteId}`}
                        className="text-blue-300/90 hover:underline"
                      >
                        Cliente #{selected.contratanteId}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <p className="pt-4 text-xs text-white/35">{TEMPLATE_HINT}</p>
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
