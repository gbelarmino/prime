export type PrimeRuntimeEnv = {
  NEXT_PUBLIC_API_BASE_URL?: string;
  NEXT_PUBLIC_SKIP_AUTH?: string;
};

declare global {
  interface Window {
    __PRIME_ENV__?: PrimeRuntimeEnv;
  }
}

function readRuntime(key: keyof PrimeRuntimeEnv): string {
  if (typeof window === "undefined") return "";
  return window.__PRIME_ENV__?.[key]?.trim() ?? "";
}

/** Build-time (Next) ou runtime (Dokploy → env-config.js no arranque do container). */
export function readPrimeEnv(key: keyof PrimeRuntimeEnv): string {
  const runtime = readRuntime(key);
  if (runtime) return runtime;
  if (key === "NEXT_PUBLIC_API_BASE_URL") {
    return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  }
  if (key === "NEXT_PUBLIC_SKIP_AUTH") {
    return process.env.NEXT_PUBLIC_SKIP_AUTH?.trim() ?? "";
  }
  return "";
}
