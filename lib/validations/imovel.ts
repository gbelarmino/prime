import { z } from "zod";

export const imovelFormSchema = z.object({
  empreendimento: z.string().min(1, "Empreendimento é obrigatório.").max(150),
  quadra: z.string().max(10).optional().or(z.literal("")),
  lote: z.union([z.string(), z.number()]).optional().or(z.literal("")),
  cidade: z.string().max(100).optional().or(z.literal("")),
  uf: z.string().max(2).optional().or(z.literal("")),
  situacao: z.number().int(),
});

export type ImovelFormValues = z.infer<typeof imovelFormSchema>;

export type ImovelApiResponse = {
  id: number;
  empreendimento: string;
  quadra: string | null;
  lote: number | null;
  cidade: string | null;
  uf: string | null;
  situacao?: number | null;
  descricaoSituacao?: string | null;
  area?: number | null;
  /** Contrato assinado vinculado, quando situação = vendido (3). */
  contratoId?: number | null;
};

export const IMOVEL_SITUACAO_VENDIDO = 3;

export function emptyImovelFormValues(): ImovelFormValues {
  return { empreendimento: "", quadra: "", lote: "", cidade: "", uf: "", situacao: 1 };
}

export function imovelResponseToFormValues(r: ImovelApiResponse): ImovelFormValues {
  return {
    empreendimento: r.empreendimento ?? "",
    quadra: r.quadra ?? "",
    lote: r.lote ?? "",
    cidade: r.cidade ?? "",
    uf: r.uf ?? "",
    situacao: r.situacao ?? 1,
  };
}

export function imovelToApiPayload(v: ImovelFormValues) {
  return {
    empreendimento: v.empreendimento.trim(),
    quadra: v.quadra?.trim() || undefined,
    lote: (typeof v.lote === 'number') ? v.lote : (v.lote ? Number(v.lote) : undefined),
    cidade: v.cidade?.trim() || undefined,
    uf: v.uf?.trim() || undefined,
    situacao: v.situacao,
  };
}
