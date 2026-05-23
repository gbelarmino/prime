const BR_DDI = "55";

/** Formata telefone para exibição (listas, modais). Aceita +5566999999999, 5566..., (66) 98421-6932, etc. */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (value == null || !value.trim()) return "";

  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  let ddiPrefix = "";

  if (trimmed.startsWith("+")) {
    if (digits.startsWith(BR_DDI) && digits.length >= 12) {
      ddiPrefix = "+55 ";
      digits = digits.slice(2);
    } else {
      return trimmed.length <= 24 ? trimmed : trimmed.slice(0, 24);
    }
  } else if (digits.startsWith(BR_DDI) && digits.length >= 12) {
    ddiPrefix = "+55 ";
    digits = digits.slice(2);
  }

  if (digits.length === 10 || digits.length === 11) {
    return ddiPrefix + maskPhone(digits);
  }

  if (digits.length > 0 && digits.length < 10) {
    return ddiPrefix + maskPhone(digits);
  }

  return trimmed;
}

export function maskPhone(value: string) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");
  
  if (digits.length <= 10) {
    // Ex: (81) 3333-3333
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  } else {
    // Ex: (81) 98888-7777
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  }
}

export function isValidPhone(value: string) {
  if (!value) return false;
  
  // Se for internacional (+), aceita de 7 a 15 dígitos após o +
  if (value.startsWith("+")) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }

  const digits = value.replace(/\D/g, "");
  // Aceita 10 (fixo) ou 11 (celular) dígitos para BR
  return digits.length === 10 || digits.length === 11;
}
