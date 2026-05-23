/** Valores gravados no bundle no build (`NEXT_PUBLIC_*`). */
export const PRIME_ENV_BUILD_DEFAULTS = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  NEXT_PUBLIC_SKIP_AUTH: process.env.NEXT_PUBLIC_SKIP_AUTH ?? "false",
} as const;

/** Script síncrono — deve correr antes dos chunks async do Next. */
export function primeEnvBootstrapScript(): string {
  return `window.__PRIME_ENV__=Object.assign(window.__PRIME_ENV__||{},${JSON.stringify(
    PRIME_ENV_BUILD_DEFAULTS,
  )});`;
}
