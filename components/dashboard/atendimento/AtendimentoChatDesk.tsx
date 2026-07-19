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
import {
  janelaBadgeClass,
  janelaBadgeLabel,
  janelaHeaderText,
  janelaPodeTextoLivre,
  segundosAte,
} from "@/lib/whatsapp-janela";
import { requestTwilioSaldoRefresh } from "@/lib/twilio-saldo-events";

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

function JanelaBadge({
  conversa,
  restanteOverride,
}: {
  conversa: WhatsAppConversa;
  restanteOverride?: number;
}) {
  const restante =
    restanteOverride ??
    (conversa.janelaExpiraEm
      ? segundosAte(conversa.janelaExpiraEm)
      : (conversa.janelaRestanteSegundos ?? 0));
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${janelaBadgeClass(conversa.janelaEstado)}`}
    >
      {janelaBadgeLabel(conversa.janelaEstado, restante)}
    </span>
  );
}

function MensagemAnexo({ m }: { m: WhatsAppMensagemChat }) {
  if (!m.mediaUrl && !m.mediaNomeArquivo) return null;
  const isImage =
    (m.mediaKind ?? "").toUpperCase() === "IMAGE" ||
    (m.mediaContentType ?? "").startsWith("image/");
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
  const [conversas, setConversas] = useState<WhatsAppConversa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<WhatsAppMensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [anexoPreviewUrl, setAnexoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [nextBeforeId, setNextBeforeId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  /** Tick global para badges da lista. */
  const [listNow, setListNow] = useState(() => Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onEscolherArquivo(fileList: FileList | null) {
    const f = fileList?.[0] ?? null;
    setAnexo(f);
  }

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
      setLoading(true);
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
        setLoading(false);
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
    setMensagens([]);
    setHasMore(false);
    setNextBefore(null);
    setNextBeforeId(null);
    setTexto("");
    limparAnexo();
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
    if (!selectedId || !podeTextoLivre) return;
    if (!texto.trim() && !anexo) return;
    setLoading(true);
    setErro(null);
    try {
      const msg = anexo
        ? await atendimentoChatService.responderAnexo(
            selectedId,
            anexo,
            texto.trim() || undefined,
          )
        : await atendimentoChatService.responder(selectedId, texto.trim());
      setTexto("");
      limparAnexo();
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
            {conversas.map((c) => {
              const fechando = (c.janelaEstado ?? "").toUpperCase() === "FECHANDO";
              const restante = c.janelaExpiraEm
                ? segundosAte(c.janelaExpiraEm, listNow)
                : (c.janelaRestanteSegundos ?? 0);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-3 py-2.5 text-left transition ${
                      selectedId === c.id ? "bg-blue-500/20" : "hover:bg-white/5"
                    } ${fechando ? "border-l-2 border-l-amber-400/80" : ""}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-white">
                        {c.tituloExibicao || c.clienteNome || c.telefone}
                      </span>
                      <JanelaBadge conversa={c} restanteOverride={restante} />
                    </span>
                    <span className="font-mono text-[11px] text-white/45">{c.telefone}</span>
                    {(c.empreendimento || c.quadra || c.lote != null) && (
                      <span className="text-[11px] text-white/40">
                        {[
                          c.empreendimento,
                          c.quadra ? `Q${c.quadra}` : null,
                          c.lote != null ? `L${c.lote}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                    <span className="text-[11px] text-white/40">
                      {c.status}
                      {(c.naoLidas ?? 0) > 0 ? ` · ${c.naoLidas} nova(s)` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {conversas.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-white/30">
                Nenhuma conversa
              </li>
            ) : null}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
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
                    <MensagemAnexo m={m} />
                    {m.corpo ? (
                      <div className="whitespace-pre-wrap">{m.corpo}</div>
                    ) : null}
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
          <div className="border-t border-white/10 p-3">
            {selected && estadoSelected === "FECHANDO" ? (
              <p className="mb-2 rounded border border-amber-500/40 bg-amber-950/40 px-2.5 py-1.5 text-xs text-amber-100">
                A janela de texto livre está fechando. Responda em breve ou use um
                template após o corte.
              </p>
            ) : null}
            {selected && !podeTextoLivre ? (
              <p className="mb-2 rounded border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs text-white/55">
                {TEMPLATE_HINT}
              </p>
            ) : null}
            {anexo ? (
              <div className="mb-2 flex items-center gap-2 rounded border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs text-white/70">
                {anexoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={anexoPreviewUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <i className="pi pi-file text-base opacity-70" />
                )}
                <span className="min-w-0 flex-1 truncate">{anexo.name}</span>
                <button
                  type="button"
                  className="text-white/50 hover:text-white"
                  onClick={limparAnexo}
                  disabled={loading}
                  aria-label="Remover anexo"
                >
                  <i className="pi pi-times" />
                </button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt,.ods"
                onChange={(e) => onEscolherArquivo(e.target.files)}
              />
              <Button
                icon="pi pi-paperclip"
                outlined
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selected || loading || !podeTextoLivre}
                tooltip="Anexar imagem ou documento"
                tooltipOptions={{ position: "top" }}
              />
              <InputTextarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={2}
                className="w-full"
                placeholder={
                  !selected
                    ? "Selecione uma conversa"
                    : podeTextoLivre
                      ? anexo
                        ? "Legenda opcional…"
                        : "Escreva a resposta…"
                      : "Janela fechada — use template em WhatsApp → Modelos"
                }
                disabled={!selected || loading || !podeTextoLivre}
              />
              <Button
                icon="pi pi-send"
                onClick={() => void enviar()}
                disabled={
                  !selected ||
                  loading ||
                  !podeTextoLivre ||
                  (!texto.trim() && !anexo)
                }
                loading={loading}
              />
            </div>
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
              <div>
                <dt className="text-white/40">Cliente</dt>
                <dd>{selected.clienteNome ?? selected.clienteId ?? "—"}</dd>
              </div>
              <p className="pt-4 text-xs text-white/35">{TEMPLATE_HINT}</p>
            </dl>
          ) : (
            <p className="text-sm text-white/30">Sem conversa selecionada.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
