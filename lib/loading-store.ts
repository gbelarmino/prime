"use client";

import { create } from 'zustand';

/**
 * Store global para gerenciar o estado de carregamento do sistema Prime.
 * Suporta contagem de requisições paralelas e mensagens customizadas.
 */
interface LoadingStore {
  loadingCount: number;
  message: string | null;
  isLoading: boolean;
  
  /** Inicia um carregamento. */
  start: (message?: string) => void;
  
  /** Finaliza um carregamento. */
  stop: () => void;
  
  /** Força o encerramento de todos os carregamentos. */
  reset: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  loadingCount: 0,
  message: null,
  isLoading: false,

  start: (message = "Carregando...") => set((state) => ({
    loadingCount: state.loadingCount + 1,
    isLoading: true,
    message: message
  })),

  stop: () => set((state) => {
    const newCount = Math.max(0, state.loadingCount - 1);
    return {
      loadingCount: newCount,
      isLoading: newCount > 0,
      message: newCount > 0 ? state.message : null
    };
  }),

  reset: () => set({ loadingCount: 0, isLoading: false, message: null })
}));

/**
 * Singleton para uso fora de componentes React (ex: api-fetch.ts)
 */
export const loadingState = {
  start: (msg?: string) => useLoadingStore.getState().start(msg),
  stop: () => useLoadingStore.getState().stop(),
  reset: () => useLoadingStore.getState().reset()
};
