import type { EventoPlaceholderCatalogo } from "@/lib/email-service";

/** Substitui tokens {{chave}} pelos exemplos do catálogo (pré-visualização). */
export function substituteEmailPlaceholders(
  html: string,
  placeholders: EventoPlaceholderCatalogo[],
): string {
  if (!html) return "";
  let out = html;
  for (const ph of placeholders) {
    const sample = ph.exemplo?.trim() || ph.descricao?.trim() || ph.nomeChave;
    if (ph.token) {
      out = out.split(ph.token).join(sample);
    }
    const bare = `{{${ph.nomeChave}}}`;
    if (bare !== ph.token) {
      out = out.split(bare).join(sample);
    }
  }
  return out;
}

/** Envolve o HTML num “cartão de e-mail” para pré-visualização no painel. */
export function wrapEmailPreviewDocument(innerHtml: string, assunto?: string): string {
  const subjectBlock = assunto
    ? `<div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;"><strong>Assunto:</strong> ${escapeHtml(assunto)}</div>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:24px;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">${subjectBlock}<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:24px;color:#111827;font-size:15px;line-height:1.6;">${innerHtml || "<p style='color:#9ca3af;'>Corpo vazio</p>"}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
