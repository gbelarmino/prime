"use client";

import { useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import type {
  WhatsAppMensagemReplyTo,
  WhatsAppTemplateAprovado,
} from "@/lib/atendimento-chat-service";

type Props = {
  disabled: boolean;
  podeTextoLivre: boolean;
  janelaFechando: boolean;
  texto: string;
  onTexto: (v: string) => void;
  anexo: File | null;
  anexoPreviewUrl: string | null;
  onEscolherArquivo: (files: FileList | null) => void;
  onLimparAnexo: () => void;
  onEnviar: () => void;
  loading: boolean;
  templates: WhatsAppTemplateAprovado[];
  templateId: string;
  onTemplateId: (v: string) => void;
  onEnviarTemplate: () => void;
  enviandoTemplate: boolean;
  hasSelected: boolean;
  replyTo: WhatsAppMensagemReplyTo | null;
  onCancelReply: () => void;
};

function replyPreviewLabel(r: WhatsAppMensagemReplyTo): string {
  const corpo = r.corpo?.trim();
  if (corpo) return corpo;
  const kind = (r.mediaKind ?? "").toUpperCase();
  if (kind === "IMAGE") return "Imagem";
  if (kind === "AUDIO") return "Áudio";
  if (kind) return "Documento";
  return "Mensagem";
}

function replyAuthorLabel(r: WhatsAppMensagemReplyTo): string {
  if (r.direcao === "OUT") return "Você";
  if (r.autor === "CLIENTE") return "Cliente";
  return r.autor?.trim() || "Mensagem";
}

export function ChatComposer({
  disabled,
  podeTextoLivre,
  janelaFechando,
  texto,
  onTexto,
  anexo,
  anexoPreviewUrl,
  onEscolherArquivo,
  onLimparAnexo,
  onEnviar,
  loading,
  templates,
  templateId,
  onTemplateId,
  onEnviarTemplate,
  enviandoTemplate,
  hasSelected,
  replyTo,
  onCancelReply,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textoRef = useRef<HTMLTextAreaElement | null>(null);
  const showTemplates = hasSelected && templates.length > 0;

  useEffect(() => {
    if (!replyTo || disabled || !podeTextoLivre) return;
    const id = window.requestAnimationFrame(() => {
      const el = textoRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => window.cancelAnimationFrame(id);
  }, [replyTo, disabled, podeTextoLivre]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && podeTextoLivre && (texto.trim() || anexo)) {
        onEnviar();
      }
    }
  }

  return (
    <div className="border-t border-white/10 p-2.5">
      {hasSelected && janelaFechando ? (
        <p className="mb-2 rounded border border-amber-500/35 bg-amber-950/35 px-2 py-1 text-[11px] text-amber-100/90">
          Janela fechando — responda em breve ou use template após o corte.
        </p>
      ) : null}

      {showTemplates ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/35 bg-blue-950/25 px-2 py-1.5">
          <span className="text-[11px] text-white/45">
            {podeTextoLivre ? "Template (opcional)" : "Template"}
          </span>
          <select
            className="min-w-[10rem] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
            value={templateId}
            onChange={(e) => onTemplateId(e.target.value)}
            disabled={loading || enviandoTemplate}
          >
            {templates.map((t) => (
              <option key={t.templateId} value={t.templateId}>
                {t.nome}
              </option>
            ))}
          </select>
          <Button
            label="Enviar"
            icon="pi pi-send"
            size="small"
            onClick={onEnviarTemplate}
            disabled={!templateId || loading || enviandoTemplate}
            loading={enviandoTemplate}
          />
        </div>
      ) : null}

      {replyTo ? (
        <div className="mb-2 flex items-stretch gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/25 pl-0 pr-2">
          <div className="w-1 shrink-0 rounded-l-lg bg-emerald-400/80" aria-hidden />
          <div className="min-w-0 flex-1 py-1.5">
            <div className="text-[11px] font-medium text-emerald-300/90">
              {replyAuthorLabel(replyTo)}
            </div>
            <div className="truncate text-xs text-white/55">{replyPreviewLabel(replyTo)}</div>
          </div>
          <button
            type="button"
            className="shrink-0 self-center p-1 text-white/45 hover:text-white"
            onClick={onCancelReply}
            disabled={loading}
            aria-label="Cancelar resposta"
          >
            <i className="pi pi-times text-xs" />
          </button>
        </div>
      ) : null}

      {anexo ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/12 bg-black/25 px-2 py-1.5 text-xs text-white/70">
          {anexoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={anexoPreviewUrl} alt="" className="h-9 w-9 rounded object-cover" />
          ) : (
            <i className="pi pi-file text-base opacity-70" />
          )}
          <span className="min-w-0 flex-1 truncate">{anexo.name}</span>
          <button
            type="button"
            className="text-white/50 hover:text-white"
            onClick={onLimparAnexo}
            disabled={loading}
            aria-label="Remover anexo"
          >
            <i className="pi pi-times" />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-1.5">
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
          className="!h-10 !w-10 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !podeTextoLivre}
          aria-label="Anexar ficheiro"
          tooltip="Anexar imagem ou documento"
          tooltipOptions={{ position: "top" }}
        />
        <InputTextarea
          ref={(el) => {
            if (!el) {
              textoRef.current = null;
              return;
            }
            const anyEl = el as unknown as {
              getElement?: () => HTMLTextAreaElement;
            };
            textoRef.current =
              typeof anyEl.getElement === "function"
                ? anyEl.getElement()
                : (el as unknown as HTMLTextAreaElement);
          }}
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          autoResize
          className="min-h-[2.5rem] w-full !py-2 text-sm"
          placeholder={
            !hasSelected
              ? "Selecione uma conversa"
              : podeTextoLivre
                ? replyTo
                  ? "Escreva a resposta… (Enter envia)"
                  : anexo
                    ? "Legenda opcional… (Enter envia)"
                    : "Escreva a resposta… (Enter envia)"
                : "Janela fechada — use um template acima"
          }
          disabled={disabled || !podeTextoLivre}
        />
        <Button
          icon="pi pi-send"
          className="!h-10 !w-10 shrink-0"
          onClick={onEnviar}
          disabled={disabled || !podeTextoLivre || (!texto.trim() && !anexo)}
          loading={loading}
          aria-label="Enviar mensagem"
        />
      </div>
    </div>
  );
}
