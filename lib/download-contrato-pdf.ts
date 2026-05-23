import { toast } from "sonner";
import {
  getContratoHonorariosPdfAssinadoUrl,
  getContratoHonorariosPdfUrl,
  isApiConfigured,
} from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-storage";

function tryGetFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  // attachment; filename="contrato-123.pdf"
  const m = disposition.match(/filename=\"?([^\";]+)\"?/i);
  return m?.[1] ?? null;
}

/**
 * Busca o PDF do contrato na API (com Bearer) e dispara o download via blob.
 */
export async function downloadContratoPdf(contratoId: number): Promise<void> {
  if (!isApiConfigured()) {
    toast.error("Configure NEXT_PUBLIC_API_BASE_URL para baixar o contrato.");
    return;
  }
  const url = getContratoHonorariosPdfUrl(contratoId);
  if (!url) {
    toast.error("URL da API inválida.");
    return;
  }

  const token = getAuthToken();
  const loadingId = toast.loading("Gerando PDF…");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/pdf,application/json;q=0.9,*/*;q=0.8",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "omit",
    });

    if (!res.ok) {
      let msg = "Não foi possível gerar o PDF do contrato.";
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

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const filename =
      tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ??
      `contrato-${contratoId}.pdf`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast.success("PDF baixado.", { id: loadingId });
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  } catch {
    toast.error("Erro de rede ao gerar o PDF.", { id: loadingId });
  }
}

/**
 * Baixa o PDF assinado já anexado (legado ou Clicksign), com autenticação Bearer.
 */
export async function downloadContratoPdfAssinado(contratoId: number): Promise<void> {
  if (!isApiConfigured()) {
    toast.error("Configure NEXT_PUBLIC_API_BASE_URL para baixar o contrato.");
    return;
  }
  const url = getContratoHonorariosPdfAssinadoUrl(contratoId);
  if (!url) {
    toast.error("URL da API inválida.");
    return;
  }

  const token = getAuthToken();
  const loadingId = toast.loading("Baixando PDF…");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/pdf,application/json;q=0.9,*/*;q=0.8",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "omit",
    });

    if (!res.ok) {
      let msg = "PDF assinado não disponível para este contrato.";
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

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const filename =
      tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ??
      `contrato-${contratoId}-assinado.pdf`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast.success("PDF baixado.", { id: loadingId });
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  } catch {
    toast.error("Erro de rede ao baixar o PDF.", { id: loadingId });
  }
}

