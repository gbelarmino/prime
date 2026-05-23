import { z } from "zod";

/** Schema de lead: validação no cliente (RHF); envio vai para a API Spring Boot. */
export const leadFormSchema = z.object({
  name: z
    .string()
    .min(3, "Informe seu nome completo.")
    .max(120, "Nome muito longo.")
    .regex(/^[\p{L}\s'.-]+$/u, "Use apenas letras e espaços."),
  whatsapp: z
    .string()
    .min(10, "WhatsApp inválido.")
    .max(20, "WhatsApp inválido.")
    .regex(/^[\d\s()+.-]+$/, "Use apenas números e símbolos de telefone."),
  email: z.string().email("E-mail inválido.").max(160, "E-mail muito longo."),
  message: z.string().max(2000, "Mensagem muito longa.").optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

/** Login: validação no cliente; credenciais conferidas na API Spring Boot. */
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido.").max(160, "E-mail muito longo."),
  password: z.string().min(6, "Senha muito curta.").max(200, "Senha muito longa."),
});

export type LoginValues = z.infer<typeof loginSchema>;
