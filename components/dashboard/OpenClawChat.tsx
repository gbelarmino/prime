"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Download, Eraser, FileImage, FileSpreadsheet, FileText, Loader2, RefreshCw, Send, User } from "lucide-react";
import { toast } from "sonner";
import { ChatMarkdown } from "@/components/dashboard/ChatMarkdown";
import { apiFetch } from "@/lib/api-fetch";
import {
  getOpenClawArquivoUrl,
  getOpenClawHistoricoUrl,
  getOpenClawInstrucaoUrl,
  getOpenClawStatusUrl,
} from "@/lib/api-config";
import { splitOpenClawArquivos } from "@/lib/openclaw-arquivos";

type ChatRole = "user" | "assistant";

type ChatBubble = {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
  error?: boolean;
  runId?: string;
};

type StatusPayload = {
  enabled?: boolean;
  configured?: boolean;
  mode?: string;
  sessionKey?: string;
  deliverDefault?: boolean;
};

const STORAGE_KEY = "aires.openclaw.chat.v1";
const THINKING_BUDGET_MS = 300_000;

const THINKING_STEPS = [
  { afterMs: 0, label: "Recebi a mensagem…" },
  { afterMs: 4_000, label: "Consultando o agente na VPS…" },
  { afterMs: 12_000, label: "O OpenClaw está pensando…" },
  { afterMs: 30_000, label: "Ainda processando — isso é normal…" },
  { afterMs: 60_000, label: "Montando a resposta…" },
  { afterMs: 120_000, label: "Pedido longo — continua trabalhando…" },
  { afterMs: 180_000, label: "Já passou de 3 min — ainda aguardando o gateway…" },
  { afterMs: 240_000, label: "Quase no limite (~5 min) — finalizando…" },
] as const;

function thinkingLabelForElapsed(elapsedMs: number): string {
  let label: string = THINKING_STEPS[0].label;
  for (const step of THINKING_STEPS) {
    if (elapsedMs >= step.afterMs) label = step.label;
  }
  return label;
}

function formatElapsed(elapsedMs: number): string {
  const s = Math.floor(elapsedMs / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}:${String(rem).padStart(2, "0")}` : `${rem}s`;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadLocalChat(): ChatBubble[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatBubble[];
    return Array.isArray(parsed) ? parsed.filter((m) => m?.content && m?.role) : [];
  } catch {
    return [];
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; detail?: string; error?: string };
    return data.detail || data.message || data.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function arquivoIcon(nome: string) {
  const ext = nome.slice(nome.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "xlsx" || ext === "csv") return FileSpreadsheet;
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return FileImage;
  return FileText;
}

function OpenClawArquivoButton({ nome }: { nome: string }) {
  const [busy, setBusy] = useState(false);
  const Icon = arquivoIcon(nome);

  const baixar = async () => {
    const url = getOpenClawArquivoUrl(nome);
    if (!url || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch(url, { skipLoading: true });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Não foi possível descarregar o ficheiro.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void baixar()}
      disabled={busy}
      className="mt-2 flex max-w-full items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 py-1.5 text-left text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
    >
      {busy ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <Icon size={14} className="shrink-0" />}
      <span className="min-w-0 truncate">{nome}</span>
      <Download size={14} className="ml-auto shrink-0 opacity-70" />
    </button>
  );
}

export function OpenClawChat() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hydrated = useRef(false);

  const configured = Boolean(status?.configured);

  useEffect(() => {
    setMessages(loadLocalChat());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.filter((m) => !m.pending).slice(-100)),
      );
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, thinkingElapsedMs]);

  useEffect(() => {
    if (!sending) {
      setThinkingElapsedMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setThinkingElapsedMs(Date.now() - started), 400);
    return () => window.clearInterval(id);
  }, [sending]);

  const fetchStatus = useCallback(async () => {
    const url = getOpenClawStatusUrl();
    if (!url) return;
    setLoadingStatus(true);
    try {
      const res = await apiFetch(url, { skipLoading: true });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setStatus((await res.json()) as StatusPayload);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchHistorico = useCallback(async () => {
    const url = getOpenClawHistoricoUrl();
    if (!url) return;
    const res = await apiFetch(url, { skipLoading: true });
    if (!res.ok) return;
    const data = (await res.json()) as {
      ok?: boolean;
      messages?: { role?: string; content?: string }[];
    };
    if (!data.ok) return;
    const remote = (data.messages ?? [])
      .filter((m) => m.content?.trim())
      .map((m) => ({
        id: newId(),
        role: (m.role === "user" ? "user" : "assistant") as ChatRole,
        content: m.content!.trim(),
      }));
    if (remote.length === 0) return;
    setMessages(remote);
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchHistorico();
  }, [fetchStatus, fetchHistorico]);

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat limpo neste navegador. A sessão do agente na VPS continua.");
  };

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    const url = getOpenClawInstrucaoUrl();
    if (!text || sending || !configured || !url) return;

    const pendingId = newId();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: text },
      { id: pendingId, role: "assistant", content: "", pending: true },
    ]);
    setDraft("");
    setSending(true);
    try {
      const res = await apiFetch(url, {
        method: "POST",
        skipLoading: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrucao: text }),
      });
      if (!res.ok) {
        const err = await readError(res);
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, pending: false, error: true, content: err } : m)),
        );
        toast.error(err);
        return;
      }
      const data = (await res.json()) as { resposta?: string; warning?: string; runId?: string };
      const reply = data.resposta?.trim();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                pending: false,
                error: !reply,
                content: reply || data.warning || "Agente respondeu sem texto visível.",
                runId: data.runId,
              }
            : m,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId ? { ...m, pending: false, error: true, content: message } : m,
        ),
      );
      toast.error("Erro ao falar com o OpenClaw.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void handleSend();
    }
  };

  const progress = Math.min(100, (thinkingElapsedMs / THINKING_BUDGET_MS) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/70">
          {status?.enabled ? "ligado" : "desligado"}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] ${
            configured ? "border-emerald-400/30 text-emerald-300" : "border-red-400/30 text-red-300"
          }`}
        >
          {configured ? "configurado" : "não configurado"}
        </span>
        {status?.mode ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/50">
            {status.mode}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void fetchStatus();
            void fetchHistorico();
          }}
          disabled={loadingStatus}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          {loadingStatus ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Atualizar
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          <Eraser size={14} />
          Limpar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-white/50">
          Enter envia · Shift+Enter quebra linha
          {status?.sessionKey ? (
            <>
              {" "}
              · sessão <code className="text-xs text-white/70">{status.sessionKey}</code>
            </>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/40">
                Nenhuma mensagem ainda. Escreva abaixo para falar com o OpenClaw do Aires. Pode pedir uma
                planilha: o ficheiro aparece nesta conversa para descarga.
              </div>
            ) : null}
            {messages.map((m) => {
              const isUser = m.role === "user";
              const partes =
                !m.pending && !m.error && !isUser
                  ? splitOpenClawArquivos(m.content)
                  : { text: m.content, files: [] as string[] };
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser ? (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Bot size={16} className={m.pending ? "animate-pulse" : ""} />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-br-md bg-amber-400 text-stone-950"
                        : m.error
                          ? "whitespace-pre-wrap rounded-bl-md border border-red-400/30 bg-red-500/10 text-red-200"
                          : "rounded-bl-md bg-white/10 text-white/90"
                    }`}
                  >
                    {m.pending ? (
                      <div className="min-w-[14rem] space-y-2">
                        <p>{thinkingLabelForElapsed(thinkingElapsedMs)}</p>
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-400/70 transition-[width] duration-700"
                            style={{ width: `${Math.max(4, progress)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-white/40 tabular-nums">
                          {formatElapsed(thinkingElapsedMs)} decorridos · pode levar até ~5 min
                        </p>
                      </div>
                    ) : m.error ? (
                      m.content
                    ) : (
                      <>
                        {partes.text ? <ChatMarkdown content={partes.text} inverted={isUser} /> : null}
                        {partes.files.map((nome) => (
                          <OpenClawArquivoButton key={nome} nome={nome} />
                        ))}
                      </>
                    )}
                    {m.runId ? <div className="mt-2 font-mono text-[10px] opacity-60">runId {m.runId}</div> : null}
                  </div>
                  {isUser ? (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                      <User size={16} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>
        <form onSubmit={(e) => void handleSend(e)} className="border-t border-white/10 p-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              disabled={sending || !configured}
              placeholder={
                configured
                  ? "Escreva para o OpenClaw…"
                  : "OpenClaw não configurado (faltam variáveis na API)."
              }
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !configured || !draft.trim()}
              className="self-end rounded-xl bg-amber-400 px-4 py-3 text-stone-950 disabled:opacity-40"
              aria-label="Enviar"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
