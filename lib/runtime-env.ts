export type PrimeRuntimeEnv = {
  NEXT_PUBLIC_API_BASE_URL?: string;
  NEXT_PUBLIC_SKIP_AUTH?: string;
};

declare global {
  interface Window {
    __PRIME_ENV__?: PrimeRuntimeEnv;
  }
}

function readBuildTime(key: keyof PrimeRuntimeEnv): string {
  if (key === "NEXT_PUBLIC_API_BASE_URL") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  }
  if (key === "NEXT_PUBLIC_SKIP_AUTH") {
    return process.env.NEXT_PUBLIC_SKIP_AUTH?.trim() ?? "";
  }
  return "";
}

function readRuntime(key: keyof PrimeRuntimeEnv): string {
  if (typeof window === "undefined") return "";
  return window.__PRIME_ENV__?.[key]?.trim() ?? "";
}

function mergePrimeEnv(partial: PrimeRuntimeEnv): void {
  if (typeof window === "undefined") return;
  window.__PRIME_ENV__ = { ...window.__PRIME_ENV__, ...partial };
}

/** Runtime (Dokploy / env-config) com fallback para build-time (Next export). */
export function readPrimeEnv(key: keyof PrimeRuntimeEnv): string {
  return readRuntime(key) || readBuildTime(key);
}

export function isPrimeEnvReady(): boolean {
  return Boolean(readPrimeEnv("NEXT_PUBLIC_API_BASE_URL"));
}

let envLoadPromise: Promise<void> | null = null;

function loadEnvConfigScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-prime-env-config="1"]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `/env-config.js?t=${Date.now()}`;
    script.dataset.primeEnvConfig = "1";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/** Carrega env-config.json (Dokploy) ou env-config.js se a URL da API ainda não estiver disponível. */
export function loadPrimeEnvConfig(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isPrimeEnvReady()) return Promise.resolve();
  if (envLoadPromise) return envLoadPromise;

  envLoadPromise = (async () => {
    try {
      const res = await fetch(`/env-config.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as PrimeRuntimeEnv;
        mergePrimeEnv(data);
      }
    } catch {
      // fallback abaixo
    }

    if (!isPrimeEnvReady()) {
      await loadEnvConfigScript();
    }
  })();

  return envLoadPromise;
}

/** Garante URL da API antes de login ou chamadas críticas (corrige race no 1.º carregamento). */
export async function ensureApiBaseUrl(): Promise<string> {
  const immediate = readPrimeEnv("NEXT_PUBLIC_API_BASE_URL");
  if (immediate) return immediate;

  await loadPrimeEnvConfig();

  for (let i = 0; i < 30; i += 1) {
    const url = readPrimeEnv("NEXT_PUBLIC_API_BASE_URL");
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return readPrimeEnv("NEXT_PUBLIC_API_BASE_URL");
}
