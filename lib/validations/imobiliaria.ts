import { z } from "zod";

function cnpjDigits(s: string) {
  return s.replace(/\D/g, "");
}

export const imobiliariaFormSchema = z.object({
  razaoSocial: z.string().min(2, "Razão social é obrigatória.").max(200),
  cnpj: z
    .string()
    .min(1, "CNPJ é obrigatório.")
    .refine((v) => cnpjDigits(v).length === 14, "CNPJ deve ter 14 dígitos."),
  creciJ: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido.").max(200).optional().or(z.literal("")),
});

export type ImobiliariaFormValues = z.infer<typeof imobiliariaFormSchema>;

export type ImobiliariaApiResponse = {
  id: number;
  razaoSocial: string;
  cnpj: string;
  creciJ: string | null;
  email: string | null;
};

export function emptyImobiliariaFormValues(): ImobiliariaFormValues {
  return { razaoSocial: "", cnpj: "", creciJ: "", email: "" };
}

export function imobiliariaResponseToFormValues(r: ImobiliariaApiResponse): ImobiliariaFormValues {
  return {
    razaoSocial: r.razaoSocial ?? "",
    cnpj: r.cnpj ?? "",
    creciJ: r.creciJ ?? "",
    email: r.email ?? "",
  };
}

export function imobiliariaToApiPayload(v: ImobiliariaFormValues) {
  return {
    razaoSocial: v.razaoSocial.trim(),
    cnpj: cnpjDigits(v.cnpj),
    creciJ: v.creciJ?.trim() || undefined,
    email: v.email?.trim() || undefined,
  };
}
