/**
 * Catálogo de DDIs usado pelo seletor de país nos formulários de telefone.
 *
 * O DDI é guardado num campo separado do número local, então não dá para inferir o país contando
 * caracteres: `+55` tem 3 e `+351` tem 4. Toda separação/junção deve passar por aqui.
 */

export type PaisDdi = {
  iso: string;
  nome: string;
  bandeira: string;
  /** Código internacional com `+`. */
  ddi: string;
  /** Dígitos do número local, sem o DDI. */
  minLocal: number;
  maxLocal: number;
  /** Máscara de exibição (`#` = dígito). Sem máscara, agrupa de 3 em 3. */
  mascara?: string;
};

export const DDI_PADRAO = "+55";

/** Brasil e Portugal à frente por volume; o resto em ordem alfabética. */
export const PAISES_DDI: PaisDdi[] = [
  // A máscara do BR serve só ao placeholder: fixo (10) e celular (11) têm formatos diferentes,
  // então `maskPhone` trata o Brasil à parte em vez de usar este campo.
  { iso: "BR", nome: "Brasil", bandeira: "🇧🇷", ddi: "+55", minLocal: 10, maxLocal: 11, mascara: "(##) #####-####" },
  { iso: "PT", nome: "Portugal", bandeira: "🇵🇹", ddi: "+351", minLocal: 9, maxLocal: 9, mascara: "### ### ###" },
  { iso: "DE", nome: "Alemanha", bandeira: "🇩🇪", ddi: "+49", minLocal: 10, maxLocal: 11 },
  { iso: "AO", nome: "Angola", bandeira: "🇦🇴", ddi: "+244", minLocal: 9, maxLocal: 9, mascara: "### ### ###" },
  { iso: "AR", nome: "Argentina", bandeira: "🇦🇷", ddi: "+54", minLocal: 10, maxLocal: 10 },
  { iso: "AU", nome: "Austrália", bandeira: "🇦🇺", ddi: "+61", minLocal: 9, maxLocal: 9 },
  { iso: "BE", nome: "Bélgica", bandeira: "🇧🇪", ddi: "+32", minLocal: 8, maxLocal: 9 },
  { iso: "CL", nome: "Chile", bandeira: "🇨🇱", ddi: "+56", minLocal: 9, maxLocal: 9 },
  { iso: "ES", nome: "Espanha", bandeira: "🇪🇸", ddi: "+34", minLocal: 9, maxLocal: 9, mascara: "### ### ###" },
  // +1 é partilhado; uma entrada só evita ambiguidade ao reabrir o cadastro.
  { iso: "US", nome: "Estados Unidos / Canadá", bandeira: "🇺🇸", ddi: "+1", minLocal: 10, maxLocal: 10, mascara: "(###) ###-####" },
  { iso: "FR", nome: "França", bandeira: "🇫🇷", ddi: "+33", minLocal: 9, maxLocal: 9 },
  { iso: "NL", nome: "Holanda", bandeira: "🇳🇱", ddi: "+31", minLocal: 9, maxLocal: 9 },
  { iso: "IE", nome: "Irlanda", bandeira: "🇮🇪", ddi: "+353", minLocal: 7, maxLocal: 9 },
  { iso: "IT", nome: "Itália", bandeira: "🇮🇹", ddi: "+39", minLocal: 9, maxLocal: 10 },
  { iso: "JP", nome: "Japão", bandeira: "🇯🇵", ddi: "+81", minLocal: 9, maxLocal: 10 },
  { iso: "MZ", nome: "Moçambique", bandeira: "🇲🇿", ddi: "+258", minLocal: 9, maxLocal: 9, mascara: "### ### ###" },
  { iso: "PY", nome: "Paraguai", bandeira: "🇵🇾", ddi: "+595", minLocal: 9, maxLocal: 9 },
  { iso: "GB", nome: "Reino Unido", bandeira: "🇬🇧", ddi: "+44", minLocal: 10, maxLocal: 10 },
  { iso: "CH", nome: "Suíça", bandeira: "🇨🇭", ddi: "+41", minLocal: 9, maxLocal: 9 },
  { iso: "UY", nome: "Uruguai", bandeira: "🇺🇾", ddi: "+598", minLocal: 8, maxLocal: 8 },
];

/** Limites de um DDI fora do catálogo — permissivos, para não barrar número legítimo. */
export const LIMITES_DDI_DESCONHECIDO = { minLocal: 6, maxLocal: 14 };

export function acharPaisPorDdi(ddi: string | null | undefined): PaisDdi | undefined {
  if (!ddi?.trim()) return undefined;
  const alvo = normalizarDdi(ddi);
  return PAISES_DDI.find((p) => p.ddi === alvo);
}

/** Garante o `+` e descarta o que não for dígito. */
export function normalizarDdi(ddi: string): string {
  const digitos = ddi.replace(/\D/g, "");
  return digitos ? `+${digitos}` : "";
}

/**
 * Separa DDI e número local de um E.164. O casamento é pelo prefixo mais longo:
 * `+351937525031` é Portugal (`+351`), não `+35`.
 */
export function separarDdi(full: string | null | undefined): { ddi: string; local: string } {
  if (!full?.trim()) {
    return { ddi: DDI_PADRAO, local: "" };
  }
  const t = full.trim();
  if (!t.startsWith("+")) {
    // Sem `+` não há como distinguir DDI de DDD; mantém o comportamento histórico (Brasil).
    return { ddi: DDI_PADRAO, local: t };
  }

  const e164 = normalizarDdi(t);
  const candidatos = [...PAISES_DDI].sort((a, b) => b.ddi.length - a.ddi.length);
  const pais = candidatos.find((p) => e164.startsWith(p.ddi) && e164.length > p.ddi.length);
  if (pais) {
    return { ddi: pais.ddi, local: e164.slice(pais.ddi.length) };
  }
  return { ddi: DDI_PADRAO, local: e164.slice(DDI_PADRAO.length) };
}

/** Placeholder no formato do país, para o utilizador ver quantos dígitos são esperados. */
export function placeholderDoPais(ddi: string | null | undefined): string {
  const pais = acharPaisPorDdi(ddi);
  if (pais?.mascara) return pais.mascara.replace(/#/g, "0");
  const tamanho = pais?.maxLocal ?? 9;
  return "0".repeat(tamanho).replace(/(\d{3})(?=\d)/g, "$1 ");
}

export function juntarDdi(ddi: string | null | undefined, local: string): string {
  const codigo = normalizarDdi(ddi ?? "") || DDI_PADRAO;
  const digitos = local.replace(/\D/g, "");
  return digitos ? `${codigo}${digitos}` : "";
}
