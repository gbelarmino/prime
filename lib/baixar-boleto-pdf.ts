import { apiFetch } from "./api-fetch";

function tryGetFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const m = disposition.match(/filename="?([^";]+)"?/i);
  return m?.[1]?.trim() ?? null;
}

/** Status em que o boleto/PDF não deve ser oferecido (alinhado ao backend). */
const STATUS_SEM_PDF_BOLETO = new Set([
  "RASCUNHO",
  "AGUARDANDO_REGISTRO",
  "ERRO_REGISTRO",
  "CANCELADO",
  "BAIXA_SOLICITADA",
  "PAGO",
]);

/** Asaas expõe URL externa; Unicred e demais usam PDF via API Aires. */
export function labelAcaoBoletoPdf(urlBoleto?: string | null): string {
  return urlBoleto?.trim() ? "Abrir boleto" : "Baixar PDF";
}

export function podeBaixarPdfBoleto(status: string): boolean {
  return !STATUS_SEM_PDF_BOLETO.has(status);
}

function abrirUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

function baixarBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Baixa ou abre o boleto: usa URL do provedor (Asaas) quando disponível;
 * caso contrário, chama o endpoint de PDF local (com suporte a redirect 302).
 */
export async function baixarBoletoPdf(
  tituloId: string,
  options: { urlBoleto?: string | null; pdfUrl: string; status?: string },
): Promise<void> {
  if (options.status && !podeBaixarPdfBoleto(options.status)) {
    throw new Error("Boleto indisponível para download neste status.");
  }

  const urlBoleto = options.urlBoleto?.trim();
  if (urlBoleto) {
    abrirUrl(urlBoleto);
    return;
  }

  const res = await apiFetch(options.pdfUrl, { redirect: "manual" });
  if (res.status === 302 || res.status === 303) {
    const location = res.headers.get("Location");
    if (location) {
      abrirUrl(location);
      return;
    }
  }

  if (!res.ok) {
    let detail = "Erro ao baixar PDF";
    const text = await res.text().catch(() => "");
    if (text.trim()) {
      try {
        const errBody = JSON.parse(text) as { message?: string };
        if (errBody.message?.trim()) {
          detail = errBody.message.trim();
        } else {
          detail = text.trim();
        }
      } catch {
        detail = text.trim();
      }
    }
    throw new Error(detail);
  }

  const blob = await res.blob();
  const filename =
    tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ??
    `boleto-${tituloId}.pdf`;
  baixarBlob(blob, filename);
}
