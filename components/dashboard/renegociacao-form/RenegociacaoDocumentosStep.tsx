"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileUp, Loader2 } from "lucide-react";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { getRenegociacaoDocumentoDownloadUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import {
  documentosRenegociacaoCompletos,
  gerarDocumentosRenegociacao,
  listarDocumentosRenegociacao,
  uploadDocumentoRenegociacao,
} from "@/lib/renegociacao-service";
import {
  DOCUMENTO_RENEGOCIACAO_LABEL,
  type DocumentoRenegociacao,
  type TipoDocumentoRenegociacao,
} from "@/lib/renegociacao-types";
import { cn } from "@/lib/utils";

type Props = {
  contratoId: number;
  renegociacaoId: number;
  tiposEsperados?: string[];
  somenteLeitura?: boolean;
  onDocumentosChange?: (documentos: DocumentoRenegociacao[], completos: boolean) => void;
};

export function RenegociacaoDocumentosStep({
  contratoId,
  renegociacaoId,
  tiposEsperados,
  somenteLeitura = false,
  onDocumentosChange,
}: Props) {
  const [documentos, setDocumentos] = useState<DocumentoRenegociacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [arquivosPendentes, setArquivosPendentes] = useState<Record<number, File>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const notificar = useCallback(
    (lista: DocumentoRenegociacao[]) => {
      onDocumentosChange?.(lista, documentosRenegociacaoCompletos(lista));
    },
    [onDocumentosChange],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      let lista = await listarDocumentosRenegociacao(contratoId, renegociacaoId);
      if (lista.length === 0) {
        lista = await gerarDocumentosRenegociacao(contratoId, renegociacaoId);
      }
      setDocumentos(lista);
      notificar(lista);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar documentos");
    } finally {
      setCarregando(false);
    }
  }, [contratoId, renegociacaoId, notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleVisualizar = async (docId: number) => {
    try {
      const url = getRenegociacaoDocumentoDownloadUrl(contratoId, renegociacaoId, docId);
      if (!url) throw new Error("API não configurada");
      const res = await apiFetch(url, { skipLoading: true });
      if (!res.ok) throw new Error("Não foi possível abrir o arquivo.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir arquivo");
    }
  };

  const handleUpload = async (doc: DocumentoRenegociacao) => {
    const file = arquivosPendentes[doc.id];
    if (!file) {
      toast.error("Selecione um arquivo antes de enviar.");
      return;
    }
    setUploadingId(doc.id);
    try {
      const atualizado = await uploadDocumentoRenegociacao(
        contratoId,
        renegociacaoId,
        doc.id,
        file,
      );
      setDocumentos((prev) => {
        const next = prev.map((d) => (d.id === doc.id ? atualizado : d));
        notificar(next);
        return next;
      });
      setArquivosPendentes((prev) => {
        const copy = { ...prev };
        delete copy[doc.id];
        return copy;
      });
      toast.success(`${DOCUMENTO_RENEGOCIACAO_LABEL[doc.tipo]} enviado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploadingId(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-white/50">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        Preparando instrumentos do processo…
      </div>
    );
  }

  const lista =
    documentos.length > 0
      ? documentos
      : (tiposEsperados ?? []).map(
          (tipo, index) =>
            ({
              id: -(index + 1),
              tipo: tipo as TipoDocumentoRenegociacao,
              statusAssinatura: "PENDENTE",
              nomeArquivo: null,
              arquivoEnviado: false,
            }) satisfies DocumentoRenegociacao,
        );

  if (lista.length === 0) {
    return (
      <p className="text-sm text-white/50">
        Nenhum instrumento jurídico exigido para esta modalidade.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lista.map((doc) => {
        const label = DOCUMENTO_RENEGOCIACAO_LABEL[doc.tipo] ?? doc.tipo.replace(/_/g, " ");
        const pendente = arquivosPendentes[doc.id];
        const enviado = doc.arquivoEnviado;
        const uploadando = uploadingId === doc.id;

        return (
          <div
            key={doc.id}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-4 sm:p-5",
              enviado
                ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs text-white/45">
                  {enviado
                    ? doc.nomeArquivo ?? "Arquivo registrado"
                    : "PDF ou imagem (máx. 10 MB)"}
                </p>
              </div>
              {enviado ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : null}
            </div>

            {!somenteLeitura && doc.id > 0 ? (
              <>
                <input
                  ref={(el) => {
                    inputRefs.current[doc.id] = el;
                  }}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setArquivosPendentes((prev) => ({ ...prev, [doc.id]: file }));
                  }}
                />
                {pendente ? (
                  <p className="text-xs text-white/50">
                    Selecionado: <span className="text-white/75">{pendente.name}</span>
                  </p>
                ) : null}
                <Button
                  type="button"
                  loading={uploadando}
                  disabled={!pendente}
                  onClick={() => void handleUpload(doc)}
                  className="w-full rounded-xl border-0 bg-violet-600 text-xs font-black uppercase tracking-widest sm:w-auto"
                  label={enviado ? "Substituir arquivo" : "Enviar arquivo"}
                  icon={<FileUp className="mr-2 h-4 w-4" />}
                />
              </>
            ) : null}

            {enviado && doc.id > 0 ? (
              <button
                type="button"
                onClick={() => void handleVisualizar(doc.id)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-sky-300/90 hover:text-sky-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar arquivo
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
