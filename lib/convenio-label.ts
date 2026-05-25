import type { ConvenioBanco } from "@/lib/fin-service";

const TIPO_LABEL: Record<string, string> = {
  ASAAS: "Asaas",
  UNICRED: "Unicred",
  MANUAL: "Manual",
  API: "API",
  CNAB: "CNAB",
};

export function convenioTipoLabel(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

export function convenioOptionLabel(c: ConvenioBanco): string {
  return `${c.nome} · ${convenioTipoLabel(c.tipoIntegracao)}`;
}

/** Rótulo do convênio para seleção (nome do beneficiário, com ID quando existir). */
export function convenioBeneficiarioLabel(c: ConvenioBanco): string {
  const nome = c.nomeBeneficiario?.trim();
  const id = c.beneficiario?.trim();
  if (nome && id) {
    const idCurto = id.length > 14 ? `${id.slice(0, 10)}…` : id;
    return `${nome} · ${idCurto}`;
  }
  if (nome) return nome;
  if (id) return id;
  return c.nome?.trim() || "Sem beneficiário";
}

/** Apenas convênios com flag ativo (uso em dropdowns de seleção). */
export function filterConveniosAtivos(convenios: ConvenioBanco[]): ConvenioBanco[] {
  return convenios.filter((c) => c.ativo);
}

export function convenioDropdownOptions(convenios: ConvenioBanco[]) {
  return filterConveniosAtivos(convenios).map((c) => ({
    label: convenioOptionLabel(c),
    value: c.id,
  }));
}

/** Dropdown empreendimento → convênio: exibe só o beneficiário. */
export function convenioEmpreendimentoDropdownOptions(convenios: ConvenioBanco[]) {
  return filterConveniosAtivos(convenios).map((c) => ({
    label: convenioBeneficiarioLabel(c),
    value: c.id,
  }));
}
