"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  whatsappService,
  type WhatsAppLinhaComStatus,
} from "@/lib/whatsapp-service";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  RefreshCw,
  Power,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Shield,
  Plus,
  Trash2,
  Star,
  Ban,
  Check,
} from "lucide-react";

type WhatsAppStatusPayload = {
  instance?: { state?: string };
  provider?: string;
  message?: string;
  code?: string;
  base64?: string;
  raw?: {
    status?: string;
    lastError?: string | null;
    lazyRestore?: boolean;
    hasQr?: boolean;
  };
};

function qrFromConnectPayload(data: {
  code?: string;
  base64?: string;
  qrDataUrl?: string;
}): string | null {
  if (data.code) return data.code;
  if (data.base64) return data.base64;
  if (data.qrDataUrl) return data.qrDataUrl;
  return null;
}

function stateFromPayload(data: WhatsAppStatusPayload | null): "open" | "connecting" | "close" {
  const s = data?.instance?.state;
  if (s === "open") return "open";
  if (s === "connecting") return "connecting";
  return "close";
}

function rowState(l: WhatsAppLinhaComStatus): "open" | "connecting" | "close" {
  const s = l.connectionState;
  if (s === "open") return "open";
  if (s === "connecting") return "connecting";
  return "close";
}

function statusFingerprint(data: WhatsAppStatusPayload | null): string {
  if (!data) return "";
  return [
    data.instance?.state ?? "",
    data.provider ?? "",
    data.raw?.status ?? "",
    data.raw?.lastError ?? "",
    data.raw?.lazyRestore ?? "",
  ].join("|");
}

function linhasFingerprint(list: WhatsAppLinhaComStatus[]): string {
  return list
    .map(
      (l) =>
        `${l.id}:${l.accountId}:${l.connectionState}:${l.ativo}:${l.padrao}:${l.lastRelayError ?? ""}`,
    )
    .join(";");
}

export function WhatsAppStatus() {
  const [linhas, setLinhas] = useState<WhatsAppLinhaComStatus[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<WhatsAppStatusPayload | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const pollInFlight = useRef(false);

  const [novoAccountId, setNovoAccountId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoPadrao, setNovoPadrao] = useState(false);

  const loadLinhas = useCallback(async (silent = false) => {
    try {
      const list = await whatsappService.listLinhasComStatus({ skipLoading: silent });
      setLinhas((prev) => (linhasFingerprint(prev) === linhasFingerprint(list) ? prev : list));
      setSelectedAccountId((prev) => {
        if (prev && list.some((x) => x.accountId === prev)) return prev;
        const pad = list.find((x) => x.padrao);
        return (pad ?? list[0])?.accountId ?? null;
      });
    } catch {
      if (!silent) toast.error("Não foi possível carregar as linhas WhatsApp.");
    }
  }, []);

  const refreshQrFromRelay = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const data = await whatsappService.fetchQr(selectedAccountId, { skipLoading: true });
      const next = data ? qrFromConnectPayload(data) : null;
      if (next) {
        setQrCode((prev) => (prev === next ? prev : next));
      }
    } catch {
      /* QR expirado ou indisponível — mantém o último código mostrado */
    }
  }, [selectedAccountId]);

  const fetchStatus = useCallback(
    async (silent = false, options?: { skipQrRefresh?: boolean }) => {
      if (!selectedAccountId) {
        setStatus(null);
        return;
      }
      if (silent) {
        if (pollInFlight.current) return;
        pollInFlight.current = true;
      }
      try {
        const data = (await whatsappService.getStatus(selectedAccountId, {
          skipLoading: silent,
        })) as WhatsAppStatusPayload;
        setStatus((prev) => (statusFingerprint(prev) === statusFingerprint(data) ? prev : data));
        setFetchError(null);
        setLastSyncedAt(new Date());
        if (data.instance?.state === "open") {
          setQrCode(null);
          void loadLinhas(true);
        } else if (!options?.skipQrRefresh && data.raw?.hasQr) {
          void refreshQrFromRelay();
        }
      } catch {
        if (!silent) {
          setFetchError("Não foi possível contactar a API. Verifique rede e sessão.");
        }
      } finally {
        if (silent) {
          pollInFlight.current = false;
        }
      }
    },
    [selectedAccountId, loadLinhas, refreshQrFromRelay],
  );

  const conn = useMemo(() => stateFromPayload(status), [status]);
  const providerLabel =
    status?.provider === "wwebjs" ? "Relay wwebjs" : status?.provider ? String(status.provider) : "Relay wwebjs";

  const relayError = status?.raw?.lastError;

  const pairingActive = Boolean(qrCode);
  const statusPollMs = pairingActive ? 12_000 : conn === "connecting" ? 10_000 : 18_000;
  const qrPollMs = 20_000;

  useEffect(() => {
    void loadLinhas(false);
  }, [loadLinhas]);

  useEffect(() => {
    setQrCode(null);
  }, [selectedAccountId]);

  useEffect(() => {
    void fetchStatus(false, { skipQrRefresh: true });
  }, [fetchStatus]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pairingActive) {
        void fetchStatus(true);
      } else {
        void loadLinhas(true);
        void fetchStatus(true);
      }
    }, statusPollMs);
    return () => window.clearInterval(id);
  }, [fetchStatus, loadLinhas, statusPollMs, pairingActive]);

  useEffect(() => {
    if (!pairingActive || !selectedAccountId) return;
    const id = window.setInterval(() => {
      void refreshQrFromRelay();
    }, qrPollMs);
    return () => window.clearInterval(id);
  }, [pairingActive, selectedAccountId, refreshQrFromRelay]);

  const handleConnect = async () => {
    if (!selectedAccountId) return;
    setConnecting(true);
    try {
      const data = (await whatsappService.connect(selectedAccountId)) as WhatsAppStatusPayload;
      const qr = qrFromConnectPayload(data);

      if (qr) {
        setQrCode(qr);
        toast.success("QR gerado. Escaneie no WhatsApp.");
        void fetchStatus(true, { skipQrRefresh: true });
      } else if (data.instance?.state === "open") {
        toast.success("Já estava conectado.");
        void fetchStatus(true);
        void loadLinhas(true);
      } else {
        toast.info("A aguardar o QR da API…");
        window.setTimeout(() => void refreshQrFromRelay(), 2500);
      }
    } catch {
      toast.error("Falha ao iniciar ligação.");
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    if (!selectedAccountId) return;
    try {
      await whatsappService.logout(selectedAccountId);
      toast.success("WhatsApp desconectado nesta linha.");
      setQrCode(null);
      void fetchStatus(true);
      void loadLinhas(true);
    } catch {
      toast.error("Não foi possível desligar.");
    }
  };

  const handleRecreate = async () => {
    if (!selectedAccountId) return;
    if (!confirm("Apaga a sessão guardada e força novo pareamento nesta linha. Continuar?")) return;
    setConnecting(true);
    try {
      await whatsappService.recreate(selectedAccountId);
      toast.success("Sessão reposta. A gerar novo QR…");
      window.setTimeout(() => void handleConnect(), 2000);
      void loadLinhas(true);
    } catch {
      toast.error("Falha ao repor a sessão.");
    } finally {
      setConnecting(false);
    }
  };

  const handleAdicionarLinha = async () => {
    const acc = novoAccountId.trim();
    const nome = novoNome.trim();
    if (!acc || !nome) {
      toast.error("Preencha o identificador técnico e o nome de exibição.");
      return;
    }
    try {
      await whatsappService.createLinha({ accountId: acc, nome, padrao: novoPadrao });
      toast.success("Linha criada.");
      setNovoAccountId("");
      setNovoNome("");
      setNovoPadrao(false);
      await loadLinhas(true);
      setSelectedAccountId(acc);
    } catch {
      toast.error("Não foi possível criar a linha (identificador duplicado ou inválido).");
    }
  };

  const handleRemoverLinha = async (id: string, nome: string) => {
    if (!confirm(`Remover a linha «${nome}»? A sessão no relay será desligada.`)) return;
    try {
      await whatsappService.deleteLinha(id);
      toast.success("Linha removida.");
      await loadLinhas(true);
    } catch {
      toast.error("Falha ao remover linha.");
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      await whatsappService.setLinhaAtivo(id, !ativo);
      toast.success(!ativo ? "Linha activada." : "Linha desactivada.");
      await loadLinhas(true);
    } catch {
      toast.error("Não foi possível alterar o estado da linha.");
    }
  };

  const handleMarcarPadrao = async (id: string) => {
    try {
      await whatsappService.updateLinha(id, { padrao: true });
      toast.success("Linha padrão actualizada.");
      await loadLinhas(true);
    } catch {
      toast.error("Falha ao definir linha padrão.");
    }
  };

  const selectedRow = linhas.find((l) => l.accountId === selectedAccountId);


  const synced =
    lastSyncedAt &&
    lastSyncedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      <section className="rounded-[1.25rem] border border-white/[0.08] bg-gradient-to-br from-[#061a2f]/80 to-[#020817]/90 p-5 sm:p-6">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-white">
          Linhas WhatsApp
        </h3>
        <p className="mt-1 text-xs text-white/45">
          Cada linha corresponde a um <span className="font-mono text-white/55">accountId</span> no relay (sessão
          independente). A linha <strong className="text-white/60">padrão</strong> envia gatilhos automáticos quando o
          gatilho não escolhe outra linha.
        </p>

        {linhas.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200/80">Nenhuma linha registada.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {linhas.map((l) => {
              const rs = rowState(l);
              const selected = l.accountId === selectedAccountId;
              return (
                <li
                  key={l.id}
                  className={`flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    selected ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId(l.accountId)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{l.nome}</span>
                      {l.padrao ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                          <Star className="h-3 w-3" />
                          Padrão
                        </span>
                      ) : null}
                      {!l.ativo ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/40">
                          Inactiva
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          rs === "open"
                            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                            : rs === "connecting"
                              ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                              : "border-white/10 text-white/45"
                        }`}
                      >
                        {rs === "open" ? "Conectado" : rs === "connecting" ? "A ligar" : "Desligado"}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-white/35">{l.accountId}</p>
                    {l.lastRelayError && rs !== "open" ? (
                      <p className="mt-1 truncate text-[10px] text-rose-300/80">{l.lastRelayError}</p>
                    ) : null}
                  </button>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    {!l.padrao && l.ativo ? (
                      <button
                        type="button"
                        onClick={() => void handleMarcarPadrao(l.id)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55 hover:bg-white/5"
                      >
                        Tornar padrão
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleToggleAtivo(l.id, l.ativo)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white/55 hover:bg-white/5"
                    >
                      {l.ativo ? (
                        <>
                          <Ban className="h-3 w-3" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          Activar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoverLinha(l.id, l.nome)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 px-2 py-1 text-[10px] font-bold uppercase text-rose-300/90 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Adicionar linha</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-[11px] text-white/45">
              Identificador (relay)
              <input
                value={novoAccountId}
                onChange={(e) => setNovoAccountId(e.target.value)}
                placeholder="ex.: aires_vendas"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-500/40"
              />
            </label>
            <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-[11px] text-white/45">
              Nome na lista
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="ex.: Equipa vendas"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/50">
              <input
                type="checkbox"
                checked={novoPadrao}
                onChange={(e) => setNovoPadrao(e.target.checked)}
                className="rounded border-white/20"
              />
              Definir como padrão
            </label>
            <button
              type="button"
              onClick={() => void handleAdicionarLinha()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/90 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </div>
      </section>

      {fetchError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-500/25 bg-rose-950/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-100/90">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchStatus(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar outra vez
          </button>
        </div>
      ) : null}

      {!selectedAccountId ? (
        <p className="text-center text-sm text-white/40">Adicione ou seleccione uma linha para gerir a ligação.</p>
      ) : (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#061a2f]/90 via-[#020817]/95 to-[#020817] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400/80 via-emerald-500/40 to-teal-600/30"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.06] blur-3xl" aria-hidden />

          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-8 pl-2 sm:pl-4">
              <header className="space-y-4">
                <p className="text-[11px] font-mono text-emerald-300/70">
                  Linha seleccionada: {selectedRow?.nome ?? selectedAccountId}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      conn === "open"
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                        : conn === "connecting"
                          ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                          : "border-white/10 bg-white/[0.04] text-white/55"
                    }`}
                  >
                    {conn === "open" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Conectado
                      </>
                    ) : conn === "connecting" ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reconectando
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        Desconectado
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    <Shield className="h-3 w-3 text-white/35" />
                    {providerLabel}
                  </span>
                  {synced ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-white/25">
                      Sync {synced}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Ligação WhatsApp
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-white/45">
                    {conn === "open"
                      ? "Esta linha está pronta para enviar notificações e mensagens automáticas (conforme gatilhos e fila)."
                      : conn === "connecting"
                        ? "O servidor está a recuperar a sessão em disco. Em poucos segundos o estado deve ficar conectado — ou gere um novo QR se a sessão expirou."
                        : "Emparelhe esta linha com um WhatsApp (Aparelhos conectados) para activar o envio por este número."}
                  </p>
                  {relayError ? (
                    <p className="text-xs text-rose-300/80">
                      Último erro do relay: <span className="font-mono text-rose-200/90">{relayError}</span>
                    </p>
                  ) : null}
                </div>
              </header>

              <ol className="space-y-3 border-t border-white/[0.06] pt-6 text-sm text-white/50">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-bold text-emerald-400/90">
                    1
                  </span>
                  <span>
                    Toque em <strong className="text-white/70">Gerar QR</strong> abaixo.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-bold text-emerald-400/90">
                    2
                  </span>
                  <span>
                    No celular: <strong className="text-white/70">WhatsApp</strong> → Ajustes → Aparelhos
                    conectados → Conectar aparelho.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-bold text-emerald-400/90">
                    3
                  </span>
                  <span>Aponte a câmera para o código ao lado.</span>
                </li>
              </ol>

              <div className="flex flex-wrap gap-3 pt-2">
                {conn !== "open" && conn !== "connecting" ? (
                  <button
                    type="button"
                    disabled={connecting || !selectedRow?.ativo}
                    onClick={() => void handleConnect()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Smartphone className="h-4 w-4" />
                    {connecting ? "A gerar QR…" : "Gerar QR"}
                  </button>
                ) : conn === "open" ? (
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20"
                  >
                    <Power className="h-4 w-4" />
                    Desconectar
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void fetchStatus(true);
                    void loadLinhas(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </button>

                {conn !== "open" && conn !== "connecting" ? (
                  <button
                    type="button"
                    disabled={connecting || !selectedRow?.ativo}
                    onClick={() => void handleRecreate()}
                    className="text-[11px] font-semibold uppercase tracking-widest text-rose-300/70 underline-offset-4 transition hover:text-rose-200 hover:underline disabled:opacity-40"
                  >
                    Redefinir sessão (apagar pareamento)
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-[280px] flex-col items-center justify-center gap-6 lg:min-h-[320px]">
              {qrCode && conn !== "open" ? (
                <div className="w-full max-w-[300px] animate-in zoom-in-95 duration-300">
                  <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-2xl shadow-black/40">
                    <div className="overflow-hidden rounded-2xl bg-white">
                      {qrCode.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrCode} alt="Código QR para parear WhatsApp" className="h-64 w-64 object-contain" />
                      ) : (
                        <div className="flex h-64 w-64 items-center justify-center bg-white">
                          <QRCodeSVG value={qrCode} size={232} level="H" includeMargin />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">
                      Escaneie com a câmara do WhatsApp
                    </p>
                    {conn === "connecting" ? (
                      <p className="mt-2 text-center text-[10px] font-medium text-slate-500">
                        A confirmar pareamento… o código permanece visível.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : conn === "open" ? (
                <div className="flex w-full max-w-[300px] flex-col items-center gap-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-center animate-in fade-in duration-500">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-900/40">
                    <CheckCircle2 className="h-10 w-10" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300/90">Operacional</p>
                    <p className="mt-2 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white">
                      Canal activo
                    </p>
                    <p className="mt-1 text-xs text-white/45">Gatilhos usam a linha padrão ou a linha definida no gatilho.</p>
                  </div>
                </div>
              ) : conn === "connecting" && !qrCode ? (
                <div className="flex w-full max-w-[300px] flex-col items-center gap-5 rounded-3xl border border-amber-500/25 bg-amber-500/[0.07] px-6 py-12 text-center animate-in fade-in duration-400">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15">
                    <RefreshCw className="h-10 w-10 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-200/90">A recuperar</p>
                    <p className="mt-2 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white">
                      Sessão em disco
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Aguarde ou toque em Atualizar. Se persistir, use Gerar QR.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex w-full max-w-[300px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Smartphone className="mx-auto h-10 w-10 text-white/25" strokeWidth={1.25} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Sem QR activo</p>
                  <p className="text-[11px] leading-relaxed text-white/35">Gere um código para aparecer aqui.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
