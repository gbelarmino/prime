"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  getContratanteByIdUrl, 
  getDocumentosContratanteUrl, 
  isApiConfigured 
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";
import { 
  contratanteResponseToFormValues, 
  type ContratanteApiResponse, 
  type ContratanteFormValues 
} from "@/lib/validations/contratante";
import type { DocumentoInfo } from "@/components/dashboard/DocumentoUploadCard";

export function useCliente(clientId?: number) {
  const [loading, setLoading] = useState(!!clientId);
  const [data, setData] = useState<ContratanteFormValues | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCliente = useCallback(async () => {
    if (!clientId || !isApiConfigured()) return;

    setLoading(true);
    setError(null);
    const token = getAuthToken();

    try {
      const dataUrl = getContratanteByIdUrl(clientId);
      const docsUrl = getDocumentosContratanteUrl(clientId);
      console.log(`Buscando dados: ${dataUrl}`);
      console.log(`Buscando documentos: ${docsUrl}`);

      const [resCliente, resDocs] = await Promise.all([
        apiFetch(dataUrl, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          skipLoading: true
        }),
        apiFetch(docsUrl, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          skipLoading: true
        })
      ]);

      if (!resCliente.ok) {
        throw new Error("Falha ao carregar dados do cliente.");
      }

      const clienteJson = (await resCliente.json()) as ContratanteApiResponse;
      setData(contratanteResponseToFormValues(clienteJson));

      if (resDocs.ok) {
        const docsJson = (await resDocs.json()) as DocumentoInfo[];
        console.log("Documentos carregados:", docsJson);
        setDocumentos(docsJson);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      fetchCliente();
    }
  }, [clientId, fetchCliente]);

  return {
    loading,
    data,
    documentos,
    error,
    refresh: fetchCliente,
  };
}
