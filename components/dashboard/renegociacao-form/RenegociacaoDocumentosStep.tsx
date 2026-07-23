"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileUp, Loader2, Upload } from "lucide-react";
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
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [uploadingTipo, setUploadingTipo] = useState<TipoDocumentoRenegociacao | null>(null);
  const [arquivosPendentes, setArquivosPendentes] = useState<
    Partial<Record<TipoDocumentoRenegociacao, File>>
  >({});
  const inputRefs = useRef<Partial<Record<TipoDocumentoRenegociacao, HTMLInputElement | null>>>({});

  const notificar = useCallback(
    (lista: DocumentoRenegociacao[]) => {
      onDocumentosChange?.(lista, documentosRenegociacaoCompletos(lista));
    },
    [onDocumentosChange],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      let lista = await listarDocumentosRenegociacao(contratoId, renegociacaoId);
      if (lista.length === 0) {
        lista = await gerarDocumentosRenegociacao(contratoId, renegociacaoId);
      }
      if (lista.length === 0) {
        setErroCarga("Nenhum instrumento foi gerado para este processo.");
      }
      setDocumentos(lista);
      notificar(lista);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar documentos";
      setErroCarga(msg);
      toast.error(msg);
      setDocumentos([]);
      notificar([]);
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

  const garantirListaComSlots = async (): Promise<DocumentoRenegociacao[]> => {
    if (documentos.length > 0) return documentos;
    const gerados = await gerarDocumentosRenegociacao(contratoId, renegociacaoId);
    setDocumentos(gerados);
    notificar(gerados);
    return gerados;
  };

  const handleUpload = async (tipo: TipoDocumentoRenegociacao) => {
    const file = arquivosPendentes[tipo];
    if (!file) {
      toast.error("Selecione um arquivo antes de enviar.");
      return;
    }
    setUploadingTipo(tipo);
    try {
      const lista = await garantirListaComSlots();
      const doc = lista.find((d) => d.tipo === tipo);
      if (!doc || doc.id <= 0) {
        throw new Error("Slot do documento não encontrado. Tente novamente.");
      }
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
        delete copy[tipo];
        return copy;
      });
      if (inputRefs.current[tipo]) {
        inputRefs.current[tipo]!.value = "";
      }
      toast.success(`${DOCUMENTO_RENEGOCIACAO_LABEL[tipo]} enviado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploadingTipo(null);
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

  const tiposFallback = (tiposEsperados ?? []).filter(Boolean) as TipoDocumentoRenegociacao[];
  const lista: DocumentoRenegociacao[] =
    documentos.length > 0
      ? documentos
      : tiposFallback.map((tipo, index) => ({
          id: -(index + 1),
          tipo,
          statusAssinatura: "PENDENTE",
          nomeArquivo: null,
          arquivoEnviado: false,
        }));

  if (lista.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-5 text-sm text-amber-100/90">
        <p>{erroCarga ?? "Nenhum instrumento jurídico exigido para esta modalidade."}</p>
        {!somenteLeitura ? (
          <Button
            type="button"
            label="Tentar novamente"
            onClick={() => void carregar()}
            className="rounded-xl border-0 bg-violet-600 text-xs font-black uppercase tracking-widest"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erroCarga && documentos.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          {erroCarga}{" "}
          {!somenteLeitura ? (
            <button
              type="button"
              className="font-semibold text-violet-300 underline"
              onClick={() => void carregar()}
            >
              Tentar gerar de novo
            </button>
          ) : null}
        </div>
      ) : null}

      {somenteLeitura ? (
        <p className="text-sm text-white/45">
          Processo efetivado ou encerrado — upload indisponível.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((doc) => {
          const label = DOCUMENTO_RENEGOCIACAO_LABEL[doc.tipo] ?? doc.tipo.replace(/_/g, " ");
          const pendente = arquivosPendentes[doc.tipo];
          const enviado = doc.arquivoEnviado;
          const uploadando = uploadingTipo === doc.tipo;
          const inputId = `reneg-doc-${renegociacaoId}-${doc.tipo}`;

          return (
            <div
              key={`${doc.tipo}-${doc.id}`}
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
                      ? (doc.nomeArquivo ?? "Arquivo registrado")
                      : "PDF ou imagem (máx. 10 MB)"}
                  </p>
                </div>
                {enviado ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : null}
              </div>

              {!somenteLeitura ? (
                <>
                  <input
                    id={inputId}
                    ref={(el) => {
                      inputRefs.current[doc.tipo] = el;
                    }}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setArquivosPendentes((prev) => ({ ...prev, [doc.tipo]: file }));
                    }}
                  />
                  <label
                    htmlFor={inputId}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/40 bg-violet-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-500/20"
                  >
                    <Upload className="h-4 w-4" />
                    {pendente ? "Trocar arquivo" : "Escolher arquivo"}
                  </label>
                  {pendente ? (
                    <p className="truncate text-xs text-white/50">
                      Selecionado: <span className="text-white/80">{pendente.name}</span>
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    loading={uploadando}
                    disabled={!pendente || uploadando}
                    onClick={() => void handleUpload(doc.tipo)}
                    className="w-full rounded-xl border-0 bg-violet-600 text-xs font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <FileUp className="h-4 w-4" />
                      {enviado ? "Substituir arquivo" : "Enviar arquivo"}
                    </span>
                  </Button>
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
    </div>
  );
}
