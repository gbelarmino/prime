import { z } from "zod";
import { numberToBrlInputValue as numberToBrlField, parseMoneyBrl } from "@/lib/currency-brl";

/** Status exibido no select (1=Proposta, 2=Revisão, 3=Aprovado, 4=Reprovado, 5=Proposta Enviada). */
export const statusContratoEnum = z.enum(["1", "2", "3", "4", "5"]);

function optionalMoney(s: string | undefined): number | null {
  return parseMoneyBrl(s);
}

function optionalInt(s: string | undefined): number | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

const idSelect = z.string()
  .min(1, "Selecione uma opção.")
  .refine((s) => s !== "0" && Number.isFinite(Number(s)) && Number(s) > 0, "ID inválido.");

export const contratoHonorariosFormSchema = z.object({
  contratanteId: idSelect,
  imobiliariaId: idSelect,
  corretorId: idSelect,
  imovelId: idSelect,
  numeroContrato: z.string().max(50).optional().nullable().or(z.literal("")),
  status: statusContratoEnum,
  dataAssinatura: z.string().min(1, "Informe a data de assinatura."), // yyyy-MM-dd
  cidadeAssinatura: z.string().min(1, "Cidade é obrigatória.").max(100),
  ufAssinatura: z.string().min(1, "UF é obrigatória.").max(2),
  valorNegociacao: z.string().min(1, "Valor da negociação é obrigatório."),
  valorLote: z.string().min(1, "Valor do lote é obrigatório."),
  valorComissaoCorretagem: z.string().min(1, "Valor comissão corretagem é obrigatório."),
  valorHonorarioEntrada: z.string().min(1, "Valor do Sinal é obrigatório."),
  valorParcelaHonorarioEntrada: z.string().min(1, "Valor parcela honorário entrada é obrigatório."),
  numParcelasMensaisEntrada: z.string().min(1, "Nº parcelas entrada é obrigatório."),
  parcelaSubsequente: z.string().min(1, "Parcela subsequente é obrigatória."),
  valorParcela: z.string().min(1, "Valor parcela é obrigatório."),
  numParcelasMensais: z.string().min(1, "Nº parcelas mensais é obrigatório."),
  dataPrimeiraParcela: z.string().min(1, "Data 1ª parcela é obrigatória."),
  diaVencimento: z.string().min(1, "Dia de vencimento é obrigatório."),
  tipoCorrecaoAnual: z.string().min(1, "Tipo correção é obrigatório."),
  percentualCorrecao: z.string().min(1, "Percentual correção é obrigatório."),
  periodicidadeCorrecao: z.string().min(1, "Periodicidade correção é obrigatória."),
  quantidadeParcelasFracionadas: z.string().optional().or(z.literal("")),
  valorFracionadoVendedora: z.string().optional().or(z.literal("")),
  valorFracionadoIntermediaria: z.string().optional().or(z.literal("")),
  taxaJurosRemuneratorios: z.string().min(1, "Taxa juros é obrigatória."),
  periodicidadeJuros: z.string().min(1, "Periodicidade juros é obrigatória."),
  limiteReajusteAnual: z.string().min(1, "Limite reajuste é obrigatório."),
  valorBaseLeilao: z.string().optional().or(z.literal("")),
  observacoes: z.string().max(500).optional().or(z.literal("")),
});

export type ContratoHonorariosFormValues = z.infer<typeof contratoHonorariosFormSchema>;

export type ContratoHonorariosApiResponse = {
  id: number;
  numeroContrato: string | null;
  dataAssinatura: string;
  status: string | null;
  contratante: { id: number; label: string } | null;
  imobiliaria: { id: number; label: string } | null;
  corretor: { id: number; label: string } | null;
  imovel: { id: number; label: string } | null;
  condicoes: {
    valorNegociacao: number | null;
    valorLote: number | null;
    valorComissaoCorretagem: number | null;
    valorHonorarioEntrada: number | null;
    valorParcelaHonorarioEntrada: number | null;
    numParcelasMensaisEntrada: number | null;
    parcelaSubsequente: number | null;
    valorParcela: number | null;
    numParcelasMensais: number | null;
    dataPrimeiraParcela: string | null;
    diaVencimento: number | null;
    tipoCorrecaoAnual: string | null;
    percentualCorrecao: number | null;
    periodicidadeCorrecao: string | null;
    quantidadeParcelasFracionadas: number | null;
    valorFracionadoVendedora: number | null;
    valorFracionadoIntermediaria: number | null;
    taxaJurosRemuneratorios: number | null;
    periodicidadeJuros: string | null;
    limiteReajusteAnual: number | null;
    valorBaseLeilao: number | null;
    observacoes: string | null;
  };
  cidadeAssinatura: string | null;
  ufAssinatura: string | null;
  criadoEm: string | null;
  atualizado_em: string | null;
  linkPdfAssinado?: string | null;
  origemAssinatura?: string | null;
};

export type PrecoLoteResponse = {
  valorNegociacao: number | null;
  valorLote: number | null;
  valorComissaoCorretagem: number | null;
  valorSinal: number | null;
  valorParcela: number | null;
  valorBoletoVendedora: number | null;
  valorBoletoImobiliaria: number | null;
  numParcelas: number | null;
  numParcelasFracionamento: number | null;
  tipoCorrecaoAnual: string | null;
  percentualCorrecao: number | null;
  periodicidadeCorrecao: string | null;
  taxaJurosRemuneratorios: number | null;
  periodicidadeJuros: string | null;
  limiteReajusteAnual: number | null;
  valorBaseLeilao: number | null;
};

export function emptyContratoHonorariosFormValues(): ContratoHonorariosFormValues {
  return {
    contratanteId: "",
    imobiliariaId: "",
    corretorId: "",
    imovelId: "",
    numeroContrato: "",
    status: "1",
    dataAssinatura: "",
    cidadeAssinatura: "FORTALEZA",
    ufAssinatura: "CE",
    valorNegociacao: "",
    valorLote: "",
    valorComissaoCorretagem: "",
    valorHonorarioEntrada: "",
    valorParcelaHonorarioEntrada: "",
    numParcelasMensaisEntrada: "",
    parcelaSubsequente: "",
    valorParcela: "",
    numParcelasMensais: "",
    dataPrimeiraParcela: "",
    diaVencimento: "",
    tipoCorrecaoAnual: "",
    percentualCorrecao: "",
    periodicidadeCorrecao: "",
    quantidadeParcelasFracionadas: "",
    valorFracionadoVendedora: "",
    valorFracionadoIntermediaria: "",
    taxaJurosRemuneratorios: "",
    periodicidadeJuros: "",
    limiteReajusteAnual: "",
    valorBaseLeilao: "",
    observacoes: "",
  };
}

export function contratoResponseToFormValues(r: ContratoHonorariosApiResponse): ContratoHonorariosFormValues {
  const c = r.condicoes;
  const num = (n: number | null | undefined) => (n != null ? String(n) : "");
  const st = r.status ? String(r.status) : "1";
  const statusVal = st === "1" || st === "2" || st === "3" || st === "4" || st === "5" ? st : "1";
  return {
    contratanteId: r.contratante ? String(r.contratante.id) : "",
    imobiliariaId: r.imobiliaria ? String(r.imobiliaria.id) : "",
    corretorId: r.corretor ? String(r.corretor.id) : "",
    imovelId: r.imovel ? String(r.imovel.id) : "",
    numeroContrato: r.numeroContrato ?? "",
    status: statusVal as "1" | "2" | "3" | "4" | "5",
    dataAssinatura: r.dataAssinatura ? r.dataAssinatura.slice(0, 10) : "",
    cidadeAssinatura: r.cidadeAssinatura ?? "",
    ufAssinatura: r.ufAssinatura ?? "",
    valorNegociacao: numberToBrlField(c.valorNegociacao),
    valorLote: numberToBrlField(c.valorLote),
    valorComissaoCorretagem: numberToBrlField(c.valorComissaoCorretagem),
    valorHonorarioEntrada: numberToBrlField(c.valorHonorarioEntrada),
    valorParcelaHonorarioEntrada: numberToBrlField(c.valorParcelaHonorarioEntrada),
    numParcelasMensaisEntrada: c.numParcelasMensaisEntrada != null ? String(c.numParcelasMensaisEntrada) : "",
    parcelaSubsequente: numberToBrlField(c.parcelaSubsequente),
    valorParcela: numberToBrlField(c.valorParcela),
    numParcelasMensais: c.numParcelasMensais != null ? String(c.numParcelasMensais) : "",
    dataPrimeiraParcela: c.dataPrimeiraParcela ? c.dataPrimeiraParcela.slice(0, 10) : "",
    diaVencimento: num(c.diaVencimento),
    tipoCorrecaoAnual: c.tipoCorrecaoAnual ?? "",
    percentualCorrecao: num(c.percentualCorrecao),
    periodicidadeCorrecao: c.periodicidadeCorrecao ?? "",
    quantidadeParcelasFracionadas: num(c.quantidadeParcelasFracionadas),
    valorFracionadoVendedora: numberToBrlField(c.valorFracionadoVendedora),
    valorFracionadoIntermediaria: numberToBrlField(c.valorFracionadoIntermediaria),
    taxaJurosRemuneratorios: num(c.taxaJurosRemuneratorios),
    periodicidadeJuros: c.periodicidadeJuros ?? "",
    limiteReajusteAnual: num(c.limiteReajusteAnual),
    valorBaseLeilao: numberToBrlField(c.valorBaseLeilao),
    observacoes: c.observacoes ?? "",
  };
}

function enumOrNull<T extends string>(v: string | undefined, allowed: readonly T[]): T | null {
  if (v == null || v === "") return null;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

const TIPOS = ["IGPM", "IPCA", "INPC", "NENHUM"] as const;
const PERIODOS = ["CADA_6_MESES", "CADA_12_MESES", "ANUAL"] as const;
const PERIODOS_JUROS = ["MENSAL", "ANUAL"] as const;

export function contratoToApiPayload(values: ContratoHonorariosFormValues): Record<string, unknown> {
  const tipoCorrecao = enumOrNull(values.tipoCorrecaoAnual, TIPOS);
  const periodicidade = enumOrNull(values.periodicidadeCorrecao, PERIODOS);
  const periodicidadeJuros = enumOrNull(values.periodicidadeJuros, PERIODOS_JUROS);

  const condicoes: Record<string, unknown> = {
    valorNegociacao: optionalMoney(values.valorNegociacao),
    valorLote: optionalMoney(values.valorLote),
    valorComissaoCorretagem: optionalMoney(values.valorComissaoCorretagem),
    valorHonorarioEntrada: optionalMoney(values.valorHonorarioEntrada),
    valorParcelaHonorarioEntrada: optionalMoney(values.valorParcelaHonorarioEntrada),
    numParcelasMensaisEntrada: optionalInt(values.numParcelasMensaisEntrada),
    parcelaSubsequente: optionalMoney(values.parcelaSubsequente),
    valorParcela: optionalMoney(values.valorParcela),
    numParcelasMensais: optionalInt(values.numParcelasMensais),
    dataPrimeiraParcela: values.dataPrimeiraParcela?.trim() || null,
    diaVencimento: optionalInt(values.diaVencimento),
    tipoCorrecaoAnual: tipoCorrecao,
    percentualCorrecao: optionalMoney(values.percentualCorrecao),
    periodicidadeCorrecao: periodicidade,
    quantidadeParcelasFracionadas: optionalInt(values.quantidadeParcelasFracionadas),
    valorFracionadoVendedora: optionalMoney(values.valorFracionadoVendedora),
    valorFracionadoIntermediaria: optionalMoney(values.valorFracionadoIntermediaria),
    taxaJurosRemuneratorios: optionalMoney(values.taxaJurosRemuneratorios),
    periodicidadeJuros: periodicidadeJuros,
    limiteReajusteAnual: optionalMoney(values.limiteReajusteAnual),
    valorBaseLeilao: optionalMoney(values.valorBaseLeilao),
    observacoes: values.observacoes?.trim() || null,
  };

  return {
    contratanteId: Number(values.contratanteId),
    imobiliariaId: Number(values.imobiliariaId),
    corretorId: Number(values.corretorId),
    imovelId: Number(values.imovelId),
    dataAssinatura: values.dataAssinatura,
    status: values.status === "4" ? 1 : Number(values.status),
    numeroContrato: values.numeroContrato?.trim() || null,
    cidadeAssinatura: values.cidadeAssinatura?.trim() || null,
    ufAssinatura: values.ufAssinatura?.trim().toUpperCase() || null,
    condicoes,
  };
}

/** Payload aninhado `condicoes` para aditivo / versão de condições. */
export function condicoesToApiPayload(
  values: ContratoHonorariosFormValues,
): Record<string, unknown> {
  const full = contratoToApiPayload(values);
  return full.condicoes as Record<string, unknown>;
}
