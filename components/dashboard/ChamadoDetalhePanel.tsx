"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { toast } from "sonner";
import {
  atualizarStatusChamado,
  baixarAnexoChamado,
  CHAMADO_STATUS_LABEL,
  CHAMADO_STATUS_TONES,
  obterChamado,
  responderChamado,
  type ChamadoDetalhe,
  type ChamadoStatus,
} from "@/lib/chamados-service";
import { canAccessChamados } from "@/lib/auth-storage";
import { dashboardStatusBadge } from "@/lib/dashboard-datatable";
import { formatBusinessDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { label: string; value: ChamadoStatus }[] = [
  { label: "Aberto", value: "ABERTO" },
  { label: "Em análise", value: "EM_ANALISE" },
  { label: "Concluído", value: "CONCLUIDO" },
  { label: "Cancelado", value: "CANCELADO" },
];

export function ChamadoDetalhePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [detalhe, setDetalhe] = useState<ChamadoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [interno, setInterno] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canAccessChamados()) {
      router.replace("/dashboard/atendimento");
    }
  }, [router]);

  const load = useCallback(async () => {
    if (!id) {
      setDetalhe(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDetalhe(await obterChamado(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar chamado");
      setDetalhe(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onStatusChange(status: ChamadoStatus) {
    if (!id || !detalhe || status === detalhe.status) return;
    setSavingStatus(true);
    try {
      setDetalhe(await atualizarStatusChamado(id, status));
      toast.success("Status atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !texto.trim()) return;
    setSending(true);
    try {
      setDetalhe(
        await responderChamado(id, {
          texto: texto.trim(),
          interno,
          files,
        }),
      );
      setTexto("");
      setFiles([]);
      setInterno(false);
      toast.success(interno ? "Nota interna registrada" : "Resposta enviada ao cliente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  if (!id) {
    return (
      <p className="px-4 text-sm text-white/50">
        Chamado não informado.{" "}
        <Link href="/dashboard/atendimento/chamados" className="text-violet-400 underline">
          Voltar à lista
        </Link>
      </p>
    );
  }

  if (loading) {
    return <p className="px-4 text-sm text-white/40">Carregando chamado…</p>;
  }

  if (!detalhe) {
    return (
      <p className="px-4 text-sm text-rose-300">
        Não foi possível carregar o chamado.{" "}
        <Link href="/dashboard/atendimento/chamados" className="underline">
          Voltar
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-10">
      <div>
        <Link
          href="/dashboard/atendimento/chamados"
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-bold uppercase tracking-widest text-violet-400 no-underline transition hover:text-violet-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Chamados
        </Link>
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-violet-400">
          Atendimento
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white md:text-4xl">
              #{detalhe.numero} — {detalhe.assunto}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {detalhe.nomeContratante ?? "Cliente"}
              {detalhe.numeroContrato ? ` · Contrato ${detalhe.numeroContrato}` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {dashboardStatusBadge(
              CHAMADO_STATUS_LABEL[detalhe.status],
              CHAMADO_STATUS_TONES,
              detalhe.status,
            )}
            <Dropdown
              value={detalhe.status}
              options={STATUS_OPTIONS}
              disabled={savingStatus}
              onChange={(e) => void onStatusChange(e.value as ChamadoStatus)}
              className="w-full sm:w-48"
              pt={{
                root: { className: "border-white/10 bg-white/5 text-white" },
                input: { className: "text-sm text-white" },
                panel: { className: "border-white/10 bg-[#071C33] text-white" },
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {detalhe.mensagens.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-xl border px-4 py-3",
              m.interno
                ? "border-amber-500/20 bg-amber-500/5"
                : m.autorTipo === "COMPRADOR"
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-violet-500/20 bg-violet-500/5",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
              <span className="font-semibold text-white/70">
                {m.autorNome ?? m.autorTipo}
                {m.interno ? " · Nota interna" : ""}
              </span>
              <span>{formatBusinessDateTime(m.criadoEm)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/85">{m.texto}</p>
            {m.anexos?.length ? (
              <ul className="mt-2 space-y-1">
                {m.anexos.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="text-xs text-violet-300 underline-offset-2 hover:underline"
                      onClick={() =>
                        void baixarAnexoChamado(detalhe.id, a.id, a.nomeOriginal).catch((err) =>
                          toast.error(err instanceof Error ? err.message : "Erro no download"),
                        )
                      }
                    >
                      {a.nomeOriginal}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={onReply}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Responder</p>
        <InputTextarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          className="w-full border-white/10 bg-white/5 text-sm text-white"
          placeholder={interno ? "Nota interna (só equipe)…" : "Resposta ao cliente…"}
          required
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            setFiles((prev) => [...prev, ...list].slice(0, 5));
            e.target.value = "";
          }}
        />
        {files.length > 0 ? (
          <ul className="space-y-1 text-xs text-white/50">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="text-rose-300"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              text
              className="!px-0 text-xs text-white/60"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="mr-2 h-4 w-4" /> Anexar
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
              <Checkbox
                inputId="nota-interna"
                checked={interno}
                onChange={(e) => setInterno(Boolean(e.checked))}
              />
              Nota interna
            </label>
          </div>
          <Button
            type="submit"
            loading={sending}
            disabled={!texto.trim()}
            className="border-0 bg-violet-600 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            {interno ? "Registrar nota" : "Enviar ao cliente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
