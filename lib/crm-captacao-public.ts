import { getCrmCaptacaoPublicUrl } from "@/lib/api-config";
import { combinePhoneWithDdi } from "@/lib/validations/crm-lead-qualificacao";

export type CaptacaoPublicaPayload = {
  tenantSlug: string;
  campanhaSlug?: string;
  nome: string;
  email?: string;
  telefone?: string;
  empreendimentoInteresse?: string;
  observacoes?: string;
  consentimentoLgpd: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export type CaptacaoPublicaResult = {
  id: number;
  nome: string;
  funilEtapaNome: string;
};

export async function submitCaptacaoPublica(
  payload: CaptacaoPublicaPayload,
  telefoneLocal?: string,
  ddi?: string,
): Promise<CaptacaoPublicaResult> {
  const url = getCrmCaptacaoPublicUrl();
  if (!url) {
    throw new Error("API não configurada.");
  }

  const telefone =
    telefoneLocal?.trim() && ddi
      ? combinePhoneWithDdi(ddi, telefoneLocal)
      : payload.telefone?.trim() || undefined;

  const body = {
    tenantSlug: payload.tenantSlug.trim().toLowerCase(),
    campanhaSlug: payload.campanhaSlug?.trim() || undefined,
    nome: payload.nome.trim(),
    email: payload.email?.trim() || undefined,
    telefone,
    empreendimentoInteresse: payload.empreendimentoInteresse?.trim() || undefined,
    observacoes: payload.observacoes?.trim() || undefined,
    consentimentoLgpd: payload.consentimentoLgpd,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    utmContent: payload.utmContent,
    utmTerm: payload.utmTerm,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* texto bruto */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as CaptacaoPublicaResult;
  return data;
}
