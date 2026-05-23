import { z } from "zod";
import { isValidCpf, maskCpf } from "@/lib/format-cpf";
import { isValidPhone, maskPhone } from "@/lib/format-phone";
import { maskCurrency, currencyToNumber } from "@/lib/format-currency";

/** Inclui string vazia para selects “sem seleção”. */
export const sexoEnum = z.enum(["", "MASCULINO", "FEMININO"]).superRefine((val, ctx) => {
  if (val === "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sexo é obrigatório." });
  }
});
export const estadoCivilEnum = z.enum([
  "",
  "SOLTEIRO",
  "CASADO",
  "DIVORCIADO",
  "VIUVO",
  "UNIAO_ESTAVEL",
]).superRefine((val, ctx) => {
  if (val === "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Estado civil é obrigatório." });
  }
});

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function cleanPhone(s: string) {
  // Mantém o + se for internacional, senão deixa só dígitos
  if (s.startsWith("+")) {
    return "+" + s.replace(/\D/g, "");
  }
  return s.replace(/\D/g, "");
}

const cpfRefine = (val: string) => isValidCpf(val);
const cpfOptionalRefine = (val: string | undefined) => {
  if (!val || val.trim() === "") return true;
  return isValidCpf(val);
};

export const conjugeFormSchema = z
  .object({
    nome: z.string().max(150),
    cpf: z
      .string()
      .max(14)
      .refine(cpfOptionalRefine, "CPF inválido."),
    rg: z.string().max(20),
    orgaoEmissor: z.string().max(30),
    email: z.string().email("E-mail inválido.").or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Se preencher qualquer campo, todos viram obrigatórios.
    // Mas a obrigatoriedade forte vem do estado civil no schema pai.
    const hasNome = !!data.nome?.trim();
    const hasCpf = !!data.cpf?.trim();
    const hasRg = !!data.rg?.trim();
    const hasOrgao = !!data.orgaoEmissor?.trim();

    const anyFilled = hasNome || hasCpf || hasRg || hasOrgao;
    const allFilled = hasNome && hasCpf && hasRg && hasOrgao;

    if (anyFilled && !allFilled) {
      const msg = "Obrigatório para cônjuge.";
      if (!hasNome) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["nome"] });
      if (!hasCpf) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["cpf"] });
      if (!hasRg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["rg"] });
      if (!hasOrgao) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["orgaoEmissor"] });
    }
  });

export type ContratanteFormSchemaOptions = {
  /** Quando false (ex.: perfil admin), a data de nascimento pode ficar em branco. */
  requireDataNascimento?: boolean;
};

export function getContratanteFormSchema(options: ContratanteFormSchemaOptions = {}) {
  const requireDataNascimento = options.requireDataNascimento !== false;

  return z.object({
  nome: z.string().min(3, "Nome é obrigatório.").max(150, "Nome muito longo."),
  sexo: sexoEnum,
  rg: z.string().min(1, "RG é obrigatório.").max(20),
  orgaoEmissor: z.string().min(1, "Órgão emissor é obrigatório.").max(30),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório.")
    .refine(cpfRefine, "CPF inválido."),
  dataNascimento: requireDataNascimento
    ? z.string().min(1, "Data de nascimento é obrigatória.")
    : z.string(),
  estadoCivil: estadoCivilEnum,
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória.").max(50),
  profissao: z.string().min(1, "Profissão é obrigatória.").max(80, "Profissão muito longa."),
  endereco: z.string().min(1, "Logradouro é obrigatório.").max(200),
  numero: z.string().min(1, "Número é obrigatório.").max(20),
  complemento: z.string().max(100),
  bairro: z.string().min(1, "Bairro é obrigatório.").max(100),
  pontoReferencia: z.string().max(150),
  cidade: z.string().min(1, "Cidade é obrigatória.").max(100),
  uf: z.string().min(1, "UF é obrigatória.").max(2),
  cep: z.string().min(1, "CEP é obrigatório.").max(9),
  telefoneCelular1: z
    .string()
    .min(1, "Celular 1 é obrigatório.")
    .refine((val) => isValidPhone(val), "Telefone inválido."),
  ddi1: z.string(),
  telefoneCelular2: z
    .string()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      return isValidPhone(val);
    }, "Telefone inválido."),
  ddi2: z.string(),
  rendaFamiliar: z.string(),
  email: z.string().email("E-mail inválido.").min(1, "E-mail é obrigatório.").max(150),
  conjuge: conjugeFormSchema,
}).superRefine((data, ctx) => {
  const ec = data.estadoCivil as string;
  if (ec === "CASADO" || ec === "UNIAO_ESTAVEL") {
    const c = data.conjuge;
    const msg = "Obrigatório para estado civil Casado/União Estável.";
    if (!c.nome?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["conjuge", "nome"] });
    }
    if (!c.cpf?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["conjuge", "cpf"] });
    }
    if (!c.rg?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["conjuge", "rg"] });
    }
    if (!c.orgaoEmissor?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["conjuge", "orgaoEmissor"] });
    }
    if (!c.email?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["conjuge", "email"] });
    }
  }
});
}

/** Schema padrão (data de nascimento obrigatória). */
export const contratanteFormSchema = getContratanteFormSchema();

export type ContratanteFormValues = z.infer<typeof contratanteFormSchema>;

/** Resposta GET `/api/contratantes/:id` (camelCase). */
export type ContratanteApiResponse = {
  id: number;
  nome: string;
  sexo: string | null;
  rg: string | null;
  orgaoEmissor: string | null;
  cpf: string;
  dataNascimento: string | null;
  estadoCivil: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  pontoReferencia: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefoneCelular1: string | null;
  telefoneCelular2: string | null;
  rendaFamiliar: number | null;
  email: string | null;
  conjuge: {
    nome: string | null;
    cpf: string | null;
    rg: string | null;
    orgaoEmissor: string | null;
    email: string | null;
  } | null;
};

export function emptyContratanteFormValues(): ContratanteFormValues {
  return {
    nome: "",
    sexo: "",
    rg: "",
    orgaoEmissor: "",
    cpf: "",
    dataNascimento: "",
    estadoCivil: "",
    nacionalidade: "",
    profissao: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    pontoReferencia: "",
    cidade: "",
    uf: "",
    cep: "",
    telefoneCelular1: "",
    ddi1: "+55",
    telefoneCelular2: "",
    ddi2: "+55",
    rendaFamiliar: "",
    email: "",
    conjuge: {
      nome: "",
      cpf: "",
      rg: "",
      orgaoEmissor: "",
      email: "",
    },
  };
}

/** Converte resposta da API para valores do formulário (edição). */
export function contratanteResponseToFormValues(data: ContratanteApiResponse): ContratanteFormValues {
  console.log("Mapeando dados da API:", data);
  const rendaStr =
    data.rendaFamiliar != null && Number.isFinite(Number(data.rendaFamiliar))
      ? Number(data.rendaFamiliar).toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : "";

  const cg = data.conjuge;
  return {
    nome: data.nome ?? "",
    sexo: (data.sexo ?? "") as ContratanteFormValues["sexo"],
    rg: data.rg ?? "",
    orgaoEmissor: data.orgaoEmissor ?? "",
    cpf: data.cpf ? maskCpf(data.cpf) : "",
    dataNascimento: data.dataNascimento ?? "",
    estadoCivil: (data.estadoCivil ?? "") as ContratanteFormValues["estadoCivil"],
    nacionalidade: data.nacionalidade ?? "",
    profissao: data.profissao ?? "",
    endereco: data.endereco ?? "",
    numero: (data.numero ?? (data as any).nr_endereco ?? (data as any).num_endereco ?? (data as any).nrEndereco ?? "").toString(),
    complemento: data.complemento ?? "",
    bairro: data.bairro ?? "",
    pontoReferencia: (data.pontoReferencia ?? (data as any).ponto_referencia ?? (data as any).ponto_ref ?? "").toString(),
    cidade: data.cidade ?? "",
    uf: data.uf ?? "",
    cep: data.cep ?? "",
    telefoneCelular1: data.telefoneCelular1 ? maskPhone(data.telefoneCelular1.startsWith("+") ? data.telefoneCelular1.slice(3) : data.telefoneCelular1) : "",
    ddi1: data.telefoneCelular1?.startsWith("+") ? data.telefoneCelular1.slice(0, 3) : "+55",
    telefoneCelular2: data.telefoneCelular2 ? maskPhone(data.telefoneCelular2.startsWith("+") ? data.telefoneCelular2.slice(3) : data.telefoneCelular2) : "",
    ddi2: data.telefoneCelular2?.startsWith("+") ? data.telefoneCelular2.slice(0, 3) : "+55",
    rendaFamiliar: data.rendaFamiliar ? maskCurrency(data.rendaFamiliar.toString()) : "",
    email: data.email ?? "",
    conjuge: {
      nome: cg?.nome ?? "",
      cpf: cg?.cpf ? maskCpf(cg.cpf) : "",
      rg: cg?.rg ?? "",
      orgaoEmissor: cg?.orgaoEmissor ?? "",
      email: cg?.email ?? "",
    },
  };
}

/** Monta JSON compatível com entidade `Contratante` + `Conjuge` embutido (camelCase). */
export function contratanteToApiPayload(values: ContratanteFormValues): Record<string, unknown> {
  const emptyToUndef = (s: string | undefined) => {
    const t = s?.trim();
    return t ? t : undefined;
  };

  const sexoStr = values.sexo as string;
  const sexo = sexoStr === "" ? undefined : sexoStr;
  const ecStr = values.estadoCivil as string;
  const estadoCivil = ecStr === "" ? undefined : ecStr;

  const c = values.conjuge;
  const conjuge =
    emptyToUndef(c.nome) ||
    (c.cpf && digitsOnly(c.cpf).length > 0) ||
    emptyToUndef(c.rg) ||
    emptyToUndef(c.orgaoEmissor)
      ? {
          nome: emptyToUndef(c.nome),
          cpf: c.cpf ? digitsOnly(c.cpf) : undefined,
          rg: emptyToUndef(c.rg),
          orgaoEmissor: emptyToUndef(c.orgaoEmissor),
          email: emptyToUndef(c.email),
        }
      : undefined;

  return {
    nome: values.nome.trim(),
    sexo,
    rg: emptyToUndef(values.rg),
    orgaoEmissor: emptyToUndef(values.orgaoEmissor),
    cpf: digitsOnly(values.cpf),
    dataNascimento: emptyToUndef(values.dataNascimento) ?? undefined,
    estadoCivil,
    nacionalidade: emptyToUndef(values.nacionalidade),
    profissao: emptyToUndef(values.profissao),
    endereco: emptyToUndef(values.endereco),
    numero: emptyToUndef(values.numero),
    complemento: emptyToUndef(values.complemento),
    bairro: emptyToUndef(values.bairro),
    pontoReferencia: emptyToUndef(values.pontoReferencia),
    cidade: emptyToUndef(values.cidade),
    uf: emptyToUndef(values.uf)?.toUpperCase(),
    cep: emptyToUndef(values.cep),
    telefoneCelular1: cleanPhone((values.ddi1 || "+55") + values.telefoneCelular1),
    telefoneCelular2: values.telefoneCelular2 ? cleanPhone((values.ddi2 || "+55") + values.telefoneCelular2) : undefined,
    rendaFamiliar: values.rendaFamiliar ? currencyToNumber(values.rendaFamiliar).toString() : undefined,
    email: emptyToUndef(values.email),
    ...(conjuge ? { conjuge } : {}),
  };
}
