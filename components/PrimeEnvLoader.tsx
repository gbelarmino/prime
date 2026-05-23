"use client";

import { useEffect } from "react";
import { loadPrimeEnvConfig } from "@/lib/runtime-env";

/** Pré-carrega env runtime (Dokploy) antes de interações que dependem da URL da API. */
export function PrimeEnvLoader() {
  useEffect(() => {
    void loadPrimeEnvConfig();
  }, []);

  return null;
}
