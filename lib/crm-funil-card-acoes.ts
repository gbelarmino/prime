import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  MessageSquare,
  UserCog,
} from "lucide-react";
import type {
  FunilAcaoCodigo,
  FunilCardAcaoCondicao,
  FunilCardAcaoDto,
  LeadDto,
  LeadTemperatura,
} from "@/lib/crm-service";

export const FUNIL_EVENTO_CARD_CLIQUE = "CARD_ACAO_CLIQUE" as const;

const ICON_BY_CODIGO: Record<string, LucideIcon> = {
  UserCog,
  ClipboardList,
  MessageSquare,
};

export function funilCardAcaoIcon(icone: string | null): LucideIcon | null {
  if (!icone) return null;
  return ICON_BY_CODIGO[icone] ?? null;
}

export function matchesFunilCardAcaoCondicao(
  lead: LeadDto,
  condicao: FunilCardAcaoCondicao | null | undefined,
): boolean {
  if (!condicao) return true;
  if (condicao.requerNaoCliente && lead.contratanteId != null) return false;
  if (condicao.requerCadastroIncompleto && (lead.cadastroClienteCompleto ?? false)) {
    return false;
  }
  if (condicao.etapaIds?.length && !condicao.etapaIds.includes(lead.funilEtapaId)) {
    return false;
  }
  if (
    condicao.temperaturas?.length &&
    !condicao.temperaturas.includes(lead.temperatura as LeadTemperatura)
  ) {
    return false;
  }
  return true;
}

export function filterFunilCardAcoesForLead(
  acoes: FunilCardAcaoDto[],
  lead: LeadDto,
): FunilCardAcaoDto[] {
  return acoes
    .filter((a) => a.ativo)
    .filter((a) => matchesFunilCardAcaoCondicao(lead, a.condicao))
    .sort((a, b) => a.ordem - b.ordem);
}

export type FunilCardAcaoHandlers = Record<
  FunilAcaoCodigo,
  (lead: LeadDto) => void
>;
