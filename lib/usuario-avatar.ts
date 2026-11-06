import { apiFetch } from "@/lib/api-fetch";
import { getUsuarioAvatarUrl, getUsuarioMeAvatarUrl } from "@/lib/api-config";

export const USUARIO_AVATAR_CHANGED_EVENT = "aires:usuario-avatar-changed";

export function notifyUsuarioAvatarChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USUARIO_AVATAR_CHANGED_EVENT));
}

async function fetchAvatarObjectUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const response = await apiFetch(url, { skipLoading: true });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") && blob.size === 0) return null;
  return URL.createObjectURL(blob);
}

/** Carrega o avatar do usuário autenticado como object URL (revogar com URL.revokeObjectURL). */
export async function fetchUsuarioMeAvatarObjectUrl(): Promise<string | null> {
  return fetchAvatarObjectUrl(getUsuarioMeAvatarUrl());
}

/** Carrega o avatar de um usuário (ADMIN) como object URL. */
export async function fetchUsuarioAvatarObjectUrl(id: number): Promise<string | null> {
  return fetchAvatarObjectUrl(getUsuarioAvatarUrl(id));
}

export async function uploadUsuarioMeAvatar(file: File): Promise<{ temAvatar: boolean }> {
  const url = getUsuarioMeAvatarUrl();
  if (!url) throw new Error("URL de avatar indisponível");
  const fd = new FormData();
  fd.append("file", file);
  const response = await apiFetch(url, { method: "POST", body: fd });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message || "Erro ao enviar a foto.",
    );
  }
  const data = (await response.json()) as { temAvatar?: boolean };
  notifyUsuarioAvatarChanged();
  return { temAvatar: Boolean(data.temAvatar) };
}

export async function deleteUsuarioMeAvatar(): Promise<void> {
  const url = getUsuarioMeAvatarUrl();
  if (!url) throw new Error("URL de avatar indisponível");
  const response = await apiFetch(url, { method: "DELETE" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message || "Erro ao remover a foto.",
    );
  }
  notifyUsuarioAvatarChanged();
}
