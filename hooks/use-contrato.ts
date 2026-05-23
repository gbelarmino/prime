"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { getContratoHonorariosByIdUrl, getContratoHistoricoUrl } from "@/lib/api-config";
import { toast } from "sonner";

export function useContrato(id?: number) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Busca dados do contrato
      const res = await apiFetch(getContratoHonorariosByIdUrl(id));
      if (res.ok) {
        const contrato = await res.json();
        setData(contrato);
      } else {
        toast.error("Contrato não encontrado.");
      }

      // Busca histórico
      const resHist = await apiFetch(getContratoHistoricoUrl(id));
      if (resHist.ok) {
        const hist = await resHist.json();
        setHistorico(hist);
      }
    } catch (err) {
      console.error("Erro ao carregar contrato", err);
      toast.error("Erro ao carregar dados do contrato.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { loading, data, historico, reload: fetchData };
}
