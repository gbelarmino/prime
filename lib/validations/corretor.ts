import { z } from "zod";

export const corretorFormSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório.").max(150),
  email: z.union([z.string().email("E-mail inválido.").max(150), z.literal("")]).optional(),
  creci: z.string().min(1, "CRECI é obrigatório.").max(20),
  imobiliariaId: z.string().min(1, "Selecione a imobiliária."),
});

export type CorretorFormValues = z.input<typeof corretorFormSchema>;
export type CorretorFormOutput = z.output<typeof corretorFormSchema>;

export type CorretorApiResponse = {
  id: number;
  nome: string;
  email: string | null;
  creci: string;
  imobiliariaId: number;
  imobiliariaRazaoSocial: string | null;
};

export function emptyCorretorFormValues(): CorretorFormValues {
  return { nome: "", email: "", creci: "", imobiliariaId: "" };
}

export function corretorResponseToFormValues(r: CorretorApiResponse): CorretorFormValues {
  return {
    nome: r.nome ?? "",
    email: r.email ?? "",
    creci: r.creci ?? "",
    imobiliariaId: r.imobiliariaId != null ? String(r.imobiliariaId) : "",
  };
}

export function corretorToApiPayload(v: CorretorFormOutput) {
  return {
    nome: v.nome.trim(),
    email: v.email?.trim() || undefined,
    creci: v.creci.trim(),
    imobiliariaId: Number(v.imobiliariaId),
  };
}
