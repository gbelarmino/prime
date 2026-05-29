"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import type { EventoPlaceholderCatalogo } from "@/lib/email-service";
import {
  substituteEmailPlaceholders,
  wrapEmailPreviewDocument,
} from "@/lib/email-template-placeholders";
import { cn } from "@/lib/utils";
import "quill/dist/quill.snow.css";

const PrimeEditor = dynamic(
  () => import("primereact/editor").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white/40">
        A carregar editor…
      </div>
    ),
  },
);

type DashboardEmailHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholders?: EventoPlaceholderCatalogo[];
  /** Texto do assunto (opcional) — mostrado na pré-visualização. */
  assuntoPreview?: string;
  minHeight?: string;
  className?: string;
};

const EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "indent",
  "link",
  "align",
  "color",
  "background",
  "clean",
];

const EDITOR_PT = {
  root: { className: "dashboard-email-editor rounded-xl overflow-hidden border border-white/10" },
  toolbar: { className: "ql-toolbar !border-white/10 !bg-white/[0.06]" },
  content: {
    className: "ql-container !border-white/10 !bg-white/[0.04] !text-white min-h-[240px]",
  },
};

export function DashboardEmailHtmlEditor({
  value,
  onChange,
  placeholders = [],
  assuntoPreview,
  minHeight = "280px",
  className,
}: DashboardEmailHtmlEditorProps) {
  const editorQuillRef = useRef<{ insertText: (i: number, t: string, s?: string) => void; getSelection: (f?: boolean) => { index: number } | null; getLength: () => number; setSelection: (i: number, l: number, s?: string) => void } | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const previewSrcDoc = useMemo(() => {
    const body = substituteEmailPlaceholders(value, placeholders);
    const assunto = assuntoPreview
      ? substituteEmailPlaceholders(assuntoPreview, placeholders)
      : undefined;
    return wrapEmailPreviewDocument(body, assunto);
  }, [value, assuntoPreview, placeholders]);

  const insertPlaceholder = useCallback(
    (token: string) => {
      if (mode === "preview") {
        onChange(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`);
        toast.success(`Inserido: ${token}`);
        return;
      }
      const quill = editorQuillRef.current;
      if (!quill) {
        onChange(`${value}${token}`);
        toast.success(`Inserido: ${token}`);
        return;
      }
      const range = quill.getSelection(true);
      const index = range?.index ?? quill.getLength();
      quill.insertText(index, token, "user");
      quill.setSelection(index + token.length, 0, "user");
    },
    [mode, onChange, value],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition",
              mode === "edit" ? "bg-sky-600 text-white" : "text-white/50 hover:text-white/80",
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition",
              mode === "preview" ? "bg-sky-600 text-white" : "text-white/50 hover:text-white/80",
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Pré-visualização
          </button>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/35">
          HTML guardado automaticamente · tokens {"{{…}}"} preservados
        </span>
      </div>

      {placeholders.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          {placeholders.map((ph) => (
            <button
              key={ph.id}
              type="button"
              title={
                (ph.descricao || "") + (ph.exemplo ? ` — ex.: ${ph.exemplo}` : "") + " · clique para inserir"
              }
              onClick={() => {
                void navigator.clipboard.writeText(ph.token);
                insertPlaceholder(ph.token);
              }}
              className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] text-sky-200/90 transition hover:border-sky-400/40 hover:bg-sky-500/15"
            >
              {ph.token}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "edit" ? (
        <div style={{ minHeight }}>
          <PrimeEditor
            value={value}
            onLoad={(q) => {
              editorQuillRef.current = q;
            }}
            onTextChange={(e) => onChange(e.htmlValue ?? "")}
            formats={EDITOR_FORMATS}
            style={{ height: minHeight }}
            pt={EDITOR_PT}
            placeholder="Escreva o corpo do e-mail… Use os tokens acima ou formatação visual."
          />
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-white/10 bg-[#0a1628]"
          style={{ minHeight }}
        >
          <iframe
            title="Pré-visualização do e-mail"
            srcDoc={previewSrcDoc}
            className="h-full w-full bg-transparent"
            style={{ minHeight, border: "none" }}
            sandbox=""
          />
          <p className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-white/35">
            Pré-visualização com valores de exemplo dos placeholders. O envio real usa dados do cliente/contrato.
          </p>
        </div>
      )}
    </div>
  );
}
