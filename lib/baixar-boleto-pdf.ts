import { apiFetch } from "./api-fetch";

/**
 * Extrai o nome do arquivo do Content-Disposition.
 * Prefere {@code filename*} (RFC 5987 / UTF-8) — o {@code filename=} ASCII/QP do Spring
 * costuma vir truncado ou em {@code =?UTF-8?Q?...?=}.
 */
export function tryGetFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;

  // RFC 5987: filename*=UTF-8''percent-encoded (lang opcional vazio entre as aspas)
  const star = disposition.match(/filename\*\s*=\s*([^']*)'([^']*)'([^;\s]+)/i);
  if (star?.[3]) {
    const encoded = star[3].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      // fallback abaixo
    }
  }

  // Não casar `filename*` — só `filename=`
  const plain = disposition.match(/(?:^|;\s*)filename\s*=\s*(?!\*)("?)([^";\n]+)\1/i);
  if (plain?.[2]) {
    const raw = plain[2].trim();
    if (raw.startsWith("=?") && raw.includes("?=")) {
      return null;
    }
    return raw;
  }
  return null;
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

/** Asaas expõe URL externa; arquivo local / Unicred usam PDF via API Aires. */
export function labelAcaoBoletoPdf(
  urlBoleto?: string | null,
  temArquivoBoleto?: boolean,
): string {
  if (temArquivoBoleto) return "Baixar PDF";
  return urlBoleto?.trim() ? "Abrir boleto" : "Baixar PDF";
}

export function podeBaixarPdfBoleto(status: string): boolean {
  return !STATUS_SEM_PDF_BOLETO.has(status);
}

function abrirUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function baixarBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Baixa ou abre o boleto: URL do provedor (Asaas) quando disponível e sem arquivo local;
 * caso contrário, chama o endpoint de PDF (arquivo anexado, Unicred ou gerado).
 */
export async function baixarBoletoPdf(
  tituloId: string,
  options: {
    urlBoleto?: string | null;
    temArquivoBoleto?: boolean;
    pdfUrl: string;
    status?: string;
  },
): Promise<void> {
  if (options.status && !podeBaixarPdfBoleto(options.status)) {
    throw new Error("Boleto indisponível para download neste status.");
  }

  const urlBoleto = options.urlBoleto?.trim();
  if (urlBoleto && !options.temArquivoBoleto) {
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
