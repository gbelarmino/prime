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
    setParams((p) => (p.page === next ? p : { ...p, page: next }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<SpringPage<T> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchPending = searchInput.trim() !== params.q;

  const [refreshNonce, setRefreshNonce] = useState(0);
  const listUrl =
    isApiConfigured() ? buildUrl(params.page, pageSize, params.q) : "";

  useEffect(() => {
    if (!listUrl) {
      setLoading(false);
      setPageData(null);
      setFetchError(null);
      return;
    }

    const token = getAuthToken();
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setFetchError(null);

    void (async () => {
      try {
        const res = await apiFetch(listUrl, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
          signal: controller.signal,
          skipLoading: false,
        });
        if (cancelled) return;
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
        if (cancelled) return;
        setPageData(json);
        setFetchError(null);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        const msg = "Erro de rede.";
        setFetchError(msg);
        onErrRef.current?.(msg);
        setPageData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [listUrl, refreshNonce]);

  const reload = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  return {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
    reload,
    fetchError,
    searchPending,
  };
}
