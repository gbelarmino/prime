import { loadingState } from "./loading-store";
import { getPortalToken } from "./portal-auth-storage";

export async function portalFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { skipLoading?: boolean }
): Promise<Response> {
  const skipLoading = init?.skipLoading ?? false;
  if (!skipLoading) loadingState.start();

  const token = getPortalToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { skipLoading: _, ...fetchInit } = init || {};
  try {
    return await fetch(input, { ...fetchInit, headers, credentials: "omit" });
  } finally {
    if (!skipLoading) loadingState.stop();
  }
}
