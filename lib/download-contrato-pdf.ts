import { toast } from "sonner";
import {
  getContratoExtratoAnualPdfUrl,
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

/** Mensagem de erro da API: vem em JSON quando o Spring recusa, em texto quando estoura. */
async function extrairMensagemErro(res: Response, padrao: string): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { message?: string };
      if (j.message) return j.message;
    } else {
      const t = await res.text();
      if (t && t.length < 400) return t;
    }
  } catch {
    /* ignore */
  }
  return padrao;
}

type BaixarPdfOpts = {
  url: string;
  /** Usado quando a resposta não traz Content-Disposition. */
  nomeArquivo: string;
  aguardando: string;
  erroPadrao: string;
};

/**
 * Busca um PDF na API com Bearer e dispara o download via blob. A API responde
 * application/pdf; o blob evita abrir a URL direto, que iria sem o Authorization.
 */
async function baixarPdfAutenticado({ url, nomeArquivo, aguardando, erroPadrao }: BaixarPdfOpts): Promise<void> {
  if (!isApiConfigured()) {
    toast.error("Configure NEXT_PUBLIC_API_BASE_URL para baixar o arquivo.");
    return;
  }
  if (!url) {
    toast.error("URL da API inválida.");
    return;
  }

  const token = getAuthToken();
  const loadingId = toast.loading(aguardando);

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
      toast.error(await extrairMensagemErro(res, erroPadrao), { id: loadingId });
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename =
      tryGetFilenameFromDisposition(res.headers.get("content-disposition")) ?? nomeArquivo;

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

/** PDF do contrato gerado do template. */
export async function downloadContratoPdf(contratoId: number): Promise<void> {
  return baixarPdfAutenticado({
    url: getContratoHonorariosPdfUrl(contratoId),
    nomeArquivo: `contrato-${contratoId}.pdf`,
    aguardando: "Gerando PDF…",
    erroPadrao: "Não foi possível gerar o PDF do contrato.",
  });
}

/** PDF assinado já anexado (legado ou Clicksign). */
export async function downloadContratoPdfAssinado(contratoId: number): Promise<void> {
  return baixarPdfAutenticado({
    url: getContratoHonorariosPdfAssinadoUrl(contratoId),
    nomeArquivo: `contrato-${contratoId}-assinado.pdf`,
    aguardando: "Baixando PDF…",
    erroPadrao: "PDF assinado não disponível para este contrato.",
  });
}

/** Extrato anual (evolução do saldo devedor) — o mesmo documento do portal do cliente. */
export async function downloadExtratoAnualPdf(contratoId: number): Promise<void> {
  return baixarPdfAutenticado({
    url: getContratoExtratoAnualPdfUrl(contratoId),
    nomeArquivo: `extrato-anual-contrato-${contratoId}.pdf`,
    aguardando: "Gerando extrato anual…",
    erroPadrao: "Não foi possível gerar o extrato anual.",
  });
}
