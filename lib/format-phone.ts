import {
  DDI_PADRAO,
  LIMITES_DDI_DESCONHECIDO,
  acharPaisPorDdi,
  normalizarDdi,
  separarDdi,
} from "@/lib/ddi-paises";

const BR_DDI = "55";

/**
 * Formata telefone para exibição (listas, modais). Aceita +5566999999999, +351937525031,
 * 5566..., (66) 98421-6932, etc.
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (value == null || !value.trim()) return "";

  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  if (trimmed.startsWith("+")) {
    const { ddi, local } = separarDdi(trimmed);
    if (!local) return trimmed;
    const mascarado = maskPhone(local, ddi);
    return `${ddi} ${mascarado || local}`;
  }

  let ddiPrefix = "";
  if (digits.startsWith(BR_DDI) && digits.length >= 12) {
    ddiPrefix = "+55 ";
    digits = digits.slice(2);
  }

  // Sem DDI não há como saber o país, então o formato brasileiro só entra quando a contagem de
  // dígitos é válida no Brasil (10 fixo, 11 celular). Um número de 9 dígitos — cadastro antigo sem
  // código de país — era exibido como "(93) 7525-031", inventando um DDD que não existe.
  if (digits.length === 10 || digits.length === 11) {
    return ddiPrefix + maskPhone(digits);
  }

  return ddiPrefix ? ddiPrefix + digits : trimmed;
}

/**
 * Aplica a máscara do país. Sem `ddi`, assume Brasil — os formulários antigos chamam sem o
 * parâmetro e mudar o padrão alteraria o que já funciona.
 */
export function maskPhone(value: string, ddi?: string | null) {
  if (!value) return "";

  const codigo = normalizarDdi(ddi ?? "") || DDI_PADRAO;
  const pais = acharPaisPorDdi(codigo);
  const maxDigitos = pais?.maxLocal ?? LIMITES_DDI_DESCONHECIDO.maxLocal;
  const digits = value.replace(/\D/g, "").slice(0, maxDigitos);
  if (!digits) return "";

  // Brasil antes da máscara do catálogo: fixo tem 10 dígitos e celular 11, e uma máscara
  // estática aplicaria o formato de celular ao fixo — "(81) 33333-333".
  if (codigo === DDI_PADRAO) {
    return maskPhoneBr(digits);
  }
  if (pais?.mascara) {
    return aplicarMascara(digits, pais.mascara);
  }
  // País sem máscara definida: agrupa de 3 em 3, sem inventar parênteses de DDD.
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

/** Preenche `#` da máscara com os dígitos disponíveis, parando quando eles acabam. */
function aplicarMascara(digits: string, mascara: string): string {
  let out = "";
  let i = 0;
  for (const ch of mascara) {
    if (i >= digits.length) break;
    if (ch === "#") {
      out += digits[i];
      i += 1;
    } else {
      out += ch;
    }
  }
  return out;
}

function maskPhoneBr(digits: string) {
  if (digits.length <= 10) {
    // Ex: (81) 3333-3333
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  }
  // Ex: (81) 98888-7777
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

/**
 * Valida o número local conforme o país do `ddi`. Sem `ddi`, mantém a regra brasileira de
 * 10 ou 11 dígitos (compatibilidade com as chamadas existentes).
 */
export function isValidPhone(value: string, ddi?: string | null) {
  if (!value) return false;

  const digits = value.replace(/\D/g, "");

  if (ddi != null && ddi !== "") {
    const codigo = normalizarDdi(ddi);
    const pais = acharPaisPorDdi(codigo);
    const { minLocal, maxLocal } = pais ?? LIMITES_DDI_DESCONHECIDO;
    return digits.length >= minLocal && digits.length <= maxLocal;
  }

  // Valor já em E.164 (o `+` vem no próprio campo): 7 a 15 dígitos.
  if (value.startsWith("+")) {
    return digits.length >= 7 && digits.length <= 15;
  }

  return digits.length === 10 || digits.length === 11;
}
