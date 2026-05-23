"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-storage";
import { isApiConfigured } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import type { SpringPage } from "@/lib/spring-page";

export type PaginatedListParams = {
  q: string;
  page: number;
};

type Options<T> = {
  /** Monta a URL GET com page (0-based), size e q. */
  buildUrl: (page: number, size: number, q: string) => string;
  pageSize?: number;
  debounceMs?: number;
  /** Mensagem se a resposta não for OK e o corpo não trouxer `message`. */
  fallbackErrorMessage?: string;
  onFetchError?: (message: string) => void;
};

/**
 * Estado de busca + página alinhado ao Spring: ao mudar o termo (após debounce),
 * a página volta para 0 num único update de estado.
 */
export function usePaginatedSpringList<T>({
  buildUrl,
  pageSize = 10,
  debounceMs = 400,
  fallbackErrorMessage = "Não foi possível carregar a lista.",
  onFetchError,
}: Options<T>) {
  const fallbackRef = useRef(fallbackErrorMessage);
  const onErrRef = useRef(onFetchError);

  useEffect(() => {
    fallbackRef.current = fallbackErrorMessage;
    onErrRef.current = onFetchError;
  }, [fallbackErrorMessage, onFetchError]);

  const [searchInput, setSearchInput] = useState("");
  const [params, setParams] = useState<PaginatedListParams>({ q: "", page: 0 });

  useEffect(() => {
    const id = window.setTimeout(() => {
      const nextQ = searchInput.trim();
      setParams((p) => {
        if (p.q === nextQ) return p;
        return { q: nextQ, page: 0 };
      });
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [searchInput, debounceMs]);

  const setPage = useCallback((next: number) => {
    setParams((p) => ({ ...p, page: next }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<SpringPage<T> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchPending = searchInput.trim() !== params.q;

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false);
      setPageData(null);
      setFetchError(null);
      return;
    }
    const url = buildUrl(params.page, pageSize, params.q);
    if (!url) {
      setLoading(false);
      setPageData(null);
      setFetchError(null);
      return;
    }
    const token = getAuthToken();
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch(url, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "omit",
      });
      if (!res.ok) {
        let msg = fallbackRef.current;
        try {
          const j = (await res.json()) as { message?: string };
          if (j.message) msg = j.message;
        } catch {
          /* ignore */
        }
        setFetchError(msg);
        onErrRef.current?.(msg);
        setPageData(null);
        return;
      }
      const json = (await res.json()) as SpringPage<T>;
      setPageData(json);
      setFetchError(null);
    } catch {
      const msg = "Erro de rede.";
      setFetchError(msg);
      onErrRef.current?.(msg);
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, pageSize, params.page, params.q]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
    reload: load,
    fetchError,
    searchPending,
  };
}
