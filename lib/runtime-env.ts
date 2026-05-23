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

/** Runtime (Dokploy / env-config.js) com fallback para build-time (Next export). */
export function readPrimeEnv(key: keyof PrimeRuntimeEnv): string {
  return readRuntime(key) || readBuildTime(key);
}

export function isPrimeEnvReady(): boolean {
  return Boolean(readPrimeEnv("NEXT_PUBLIC_API_BASE_URL"));
}
