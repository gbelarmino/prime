import { toast } from "sonner";
import { getContratoHonorariosHtmlUrl, isApiConfigured } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-storage";

/**
 * Busca o HTML do contrato na API (com Bearer) e abre numa nova aba via blob URL
 * (necessário porque `window.open` direto não envia o header Authorization).
 */
export async function openContratoHtmlInNewTab(contratoId: number): Promise<void> {
  if (!isApiConfigured()) {
    toast.error("Configure NEXT_PUBLIC_API_BASE_URL para gerar o contrato.");
    return;
  }
  const url = getContratoHonorariosHtmlUrl(contratoId);
  if (!url) {
    toast.error("URL da API inválida.");
    return;
  }

  const token = getAuthToken();
  const loadingId = toast.loading("Gerando contrato…");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "omit",
    });

    if (!res.ok) {
      let msg = "Não foi possível gerar o contrato.";
      const ct = res.headers.get("content-type") ?? "";
      try {
        if (ct.includes("application/json")) {
          const j = (await res.json()) as { message?: string };
          if (j.message) msg = j.message;
        } else {
          const t = await res.text();
          if (t && t.length < 400) msg = t;
        }
      } catch {
        /* ignore */
      }
      toast.error(msg, { id: loadingId });
      return;
    }

    const html = await res.text();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      URL.revokeObjectURL(blobUrl);
      toast.error("Permita pop-ups para visualizar o contrato.", { id: loadingId });
      return;
    }

    toast.success("Contrato aberto em nova aba.", { id: loadingId });
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  } catch {
    toast.error("Erro de rede ao gerar o contrato.", { id: loadingId });
  }
}
