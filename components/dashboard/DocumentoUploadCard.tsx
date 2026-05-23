"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { getDocumentoContratanteUrl } from "@/lib/api-config";
import { cn } from "@/lib/utils";

export type TipoDocumento =
  | "IDENTIDADE_COMPRADOR"
  | "IDENTIDADE_CONJUGE"
  | "COMPROVANTE_RESIDENCIA"
  | "OUTRO";

export type DocumentoInfo = {
  id: number;
  tipo: TipoDocumento;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  caminhoRelativo: string;
  criadoEm: string;
};

const LABEL: Record<TipoDocumento, string> = {
  IDENTIDADE_COMPRADOR: "Identidade do Comprador",
  IDENTIDADE_CONJUGE: "Identidade do Cônjuge",
  COMPROVANTE_RESIDENCIA: "Comprovante de Residência",
  OUTRO: "Documento adicional",
};

const ICON: Record<TipoDocumento, string> = {
  IDENTIDADE_COMPRADOR: "pi pi-id-card",
  IDENTIDADE_CONJUGE: "pi pi-id-card",
  COMPROVANTE_RESIDENCIA: "pi pi-home",
  OUTRO: "pi pi-paperclip",
};

const MAX_MB = 5;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  contratanteId: number;
  tipo: TipoDocumento;
  obrigatorio?: boolean;
  documento?: DocumentoInfo;
  pendingFile?: File;
  onFileSelected: (file: File) => void;
  onPendingRemoved: () => void;
  onDeleteQueued: (docId: number) => void;
  onPreview?: (doc: DocumentoInfo) => void;
};

export function DocumentoUploadCard({
  contratanteId,
  tipo,
  obrigatorio = false,
  documento,
  pendingFile,
  onFileSelected,
  onPendingRemoved,
  onDeleteQueued,
  onPreview,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_MB} MB.`);
      return;
    }
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error("Tipo não suportado. Use JPEG, PNG, WebP ou PDF.");
      return;
    }
    onFileSelected(file);
  };

  const cardBaseClass = "relative flex items-start gap-4 rounded-3xl border p-5 transition-all duration-300";

  // ── Estado: documento salvo no servidor ──────────────────────────────────
  if (documento) {
    const isImage = documento.contentType.startsWith("image/");
    return (
      <div className={cn(cardBaseClass, "border-emerald-500/30 bg-emerald-500/5")}>
        {obrigatorio && (
          <span className="absolute -top-2.5 left-6 bg-[#071C33] px-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
            Obrigatório
          </span>
        )}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <i className="pi pi-check-circle text-xl"></i>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{LABEL[tipo]}</p>
          <p className="mt-0.5 truncate text-xs text-white/50" title={documento.nomeOriginal}>
            {documento.nomeOriginal}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPreview?.(documento)}
              className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 bg-transparent border-none p-0 cursor-pointer"
            >
              {isImage ? "Ver Imagem" : "Abrir PDF"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteQueued(documento.id)}
              className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-transparent border-none p-0 cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: arquivo selecionado, aguardando save ─────────────────────────
  if (pendingFile) {
    return (
      <div className={cn(cardBaseClass, "border-blue-500/30 bg-blue-500/5")}>
        {obrigatorio && (
          <span className="absolute -top-2.5 left-6 bg-[#071C33] px-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
            Obrigatório
          </span>
        )}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <i className={cn(ICON[tipo], "text-xl animate-pulse")}></i>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{LABEL[tipo]}</p>
          <p className="mt-0.5 truncate text-xs text-white/50" title={pendingFile.name}>
            {pendingFile.name}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">Aguardando Save</span>
            <button
              type="button"
              onClick={onPendingRemoved}
              className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-transparent border-none p-0 cursor-pointer"
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: vazio — aguardando seleção ───────────────────────────────────
  return (
    <div
      className={cn(
        cardBaseClass,
        dragging
          ? "border-blue-500/60 bg-blue-500/5 scale-[1.02]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.01] cursor-pointer"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {obrigatorio && (
        <span className="absolute -top-2.5 left-6 bg-[#071C33] px-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
          Obrigatório
        </span>
      )}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white/20">
        <i className={cn(ICON[tipo], "text-xl")}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{LABEL[tipo]}</p>
        <p className="mt-1 text-xs text-white/30">Arraste aqui ou clique para anexar</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
