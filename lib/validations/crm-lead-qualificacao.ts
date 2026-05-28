import { z } from "zod";
import { isValidCpf } from "@/lib/format-cpf";
import { isValidPhone, maskPhone } from "@/lib/format-phone";
import type { LeadDto, LeadQualificacaoPayload } from "@/lib/crm-service";

function cleanPhone(s: string) {
  if (s.startsWith("+")) {
    return "+" + s.replace(/\D/g, "");
  }
  return s.replace(/\D/g, "");
}

/** Separa DDI e número local (mesma regra do cadastro de contratante). */
export function splitPhoneWithDdi(full: string | null | undefined): { ddi: string; local: string } {
  if (!full?.trim()) {
    return { ddi: "+55", local: "" };
  }
  const t = full.trim();
  if (t.startsWith("+")) {
    return { ddi: t.slice(0, 3), local: t.slice(3) };
  }
  return { ddi: "+55", local: t };
}

export function combinePhoneWithDdi(ddi: string, local: string): string {
  return cleanPhone((ddi.trim() || "+55") + local);
}

const sexoSchema = z
  .enum(["", "MASCULINO", "FEMININO"])
  .superRefine((val, ctx) => {
    if (val === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sexo é obrigatório." });
    }
  });

const estadoCivilSchema = z
  .enum(["", "SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"])
  .superRefine((val, ctx) => {
    if (val === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Estado civil é obrigatório." });
    }
  });

export const crmLeadQualificacaoSchema = z.object({
  nome: z.string().min(3, "Nome é obrigatório.").max(150, "Nome muito longo."),
  email: z.string().email("E-mail inválido.").min(1, "E-mail é obrigatório.").max(150),
  ddi: z.string(),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório.")
    .refine((val) => isValidPhone(val), "Telefone inválido."),
  cpf: z.string().min(1, "CPF é obrigatório.").refine((val) => isValidCpf(val), "CPF inválido."),
  empreendimentoInteresse: z.string().min(1, "Empreendimento é obrigatório.").max(150),
  sexo: sexoSchema,
  rg: z.string().min(1, "RG é obrigatório.").max(20),
  orgaoEmissor: z.string().min(1, "Órgão emissor é obrigatório.").max(30),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória."),
  estadoCivil: estadoCivilSchema,
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória.").max(50),
  profissao: z.string().min(1, "Profissão é obrigatória.").max(80),
  cep: z.string().min(1, "CEP é obrigatório.").max(9),
  endereco: z.string().min(1, "Logradouro é obrigatório.").max(200),
  numero: z.string().min(1, "Número é obrigatório.").max(20),
  complemento: z.string().max(100),
  bairro: z.string().min(1, "Bairro é obrigatório.").max(100),
  cidade: z.string().min(1, "Cidade é obrigatória.").max(100),
  uf: z.string().min(1, "UF é obrigatória.").max(2),
});

export type CrmLeadQualificacaoFormValues = z.infer<typeof crmLeadQualificacaoSchema>;

export function emptyCrmLeadQualificacaoFormValues(): CrmLeadQualificacaoFormValues {
  return {
    nome: "",
    email: "",
    ddi: "+55",
    telefone: "",
    cpf: "",
    empreendimentoInteresse: "",
    sexo: "",
    rg: "",
    orgaoEmissor: "",
    dataNascimento: "",
    estadoCivil: "",
    nacionalidade: "Brasileira",
    profissao: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  };
}

export function leadDtoToQualificacaoFormValues(lead: LeadDto): CrmLeadQualificacaoFormValues {
  const { ddi, local } = splitPhoneWithDdi(lead.telefone);
  return {
    nome: lead.nome ?? "",
    email: lead.email ?? "",
    ddi,
    telefone: local ? maskPhone(local) : "",
    cpf: lead.cpf ?? "",
    empreendimentoInteresse: lead.empreendimentoInteresse ?? "",
    sexo: (lead.sexo as CrmLeadQualificacaoFormValues["sexo"]) ?? "",
    rg: lead.rg ?? "",
    orgaoEmissor: lead.orgaoEmissor ?? "",
    dataNascimento: lead.dataNascimento?.slice(0, 10) ?? "",
    estadoCivil: (lead.estadoCivil as CrmLeadQualificacaoFormValues["estadoCivil"]) ?? "",
    nacionalidade: lead.nacionalidade ?? "Brasileira",
    profissao: lead.profissao ?? "",
    cep: lead.cep ?? "",
    endereco: lead.endereco ?? "",
    numero: lead.numero ?? "",
    complemento: lead.complemento ?? "",
    bairro: lead.bairro ?? "",
    cidade: lead.cidade ?? "",
    uf: lead.uf ?? "",
  };
}

export function qualificacaoFormValuesToPayload(
  values: CrmLeadQualificacaoFormValues,
): LeadQualificacaoPayload {
  return {
    nome: values.nome.trim(),
    email: values.email.trim(),
    telefone: combinePhoneWithDdi(values.ddi, values.telefone),
    cpf: values.cpf.replace(/\D/g, ""),
    empreendimentoInteresse: values.empreendimentoInteresse.trim(),
    sexo: values.sexo,
    rg: values.rg.trim().toUpperCase(),
    orgaoEmissor: values.orgaoEmissor.trim().toUpperCase(),
    dataNascimento: values.dataNascimento,
    estadoCivil: values.estadoCivil,
    nacionalidade: values.nacionalidade.trim(),
    profissao: values.profissao.trim(),
    cep: values.cep.trim(),
    endereco: values.endereco.trim(),
    numero: values.numero.trim(),
    complemento: values.complemento?.trim() || undefined,
    bairro: values.bairro.trim(),
    cidade: values.cidade.trim(),
    uf: values.uf.trim().toUpperCase(),
  };
}
