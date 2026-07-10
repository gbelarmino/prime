import type { AtendimentoTituloResumo } from "@/lib/atendimento-service";
import {
  calcularMemorialTitulo,
  fetchBoletoEncargosConfig,
  type BoletoEncargosConfig,
  type MemorialCalculoResult,
} from "@/lib/fin-memorial-calculo";
import { hojeNegocioIso } from "@/lib/app-business-date";
import type { MemoriaCalculoItem } from "@/lib/renegociacao-types";

export type InadimplenciaPresenteAgregado = {
  nominalTotal: number;
  multaTotal: number;
  jurosTotal: number;
  valorPresenteTotal: number;
  memoriaCalculo: string;
  itens: MemorialCalculoResult[];
};

function isVencido(t: AtendimentoTituloResumo, dataReferencia?: string): boolean {
  if (t.status === "VENCIDO") return true;
  const ref = dataReferencia ?? hojeNegocioIso();
  return t.vencimento < ref && t.status !== "PAGO" && t.status !== "CANCELADO";
}

function formatMemoriaAgregada(
  nominal: number,
  multa: number,
  juros: number,
  vp: number,
  qtd: number,
): string {
  if (qtd === 0) return "";
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${fmt(nominal)} + ${fmt(multa)} + ${fmt(juros)} = ${fmt(vp)} (${qtd} título(s) vencido(s))`;
}

export function agregarInadimplenciaPresente(
  titulos: AtendimentoTituloResumo[],
  encargos: BoletoEncargosConfig,
  dataCalculo?: string,
): InadimplenciaPresenteAgregado {
  const vencidos = titulos.filter((t) => isVencido(t, dataCalculo));
  const itens = vencidos.map((t) =>
    calcularMemorialTitulo(
      {
        valorNominal: t.valorNominal,
        vencimento: t.vencimento,
        dataCalculo,
      },
      encargos,
    ),
  );

  const nominalTotal = itens.reduce((s, i) => s + i.valorNominal, 0);
  const multaTotal = itens.reduce((s, i) => s + i.valorMulta, 0);
  const jurosTotal = itens.reduce((s, i) => s + i.valorJuros, 0);
  const valorPresenteTotal = itens.reduce((s, i) => s + i.valorAtualizado, 0);

  return {
    nominalTotal: Math.round(nominalTotal * 100) / 100,
    multaTotal: Math.round(multaTotal * 100) / 100,
    jurosTotal: Math.round(jurosTotal * 100) / 100,
    valorPresenteTotal: Math.round(valorPresenteTotal * 100) / 100,
    memoriaCalculo: formatMemoriaAgregada(
      nominalTotal,
      multaTotal,
      jurosTotal,
      valorPresenteTotal,
      itens.length,
    ),
    itens,
  };
}

/** Títulos vencidos do painel (abertos + vencidos), sem duplicar. */
export function titulosVencidosDoPainel(
  titulosAbertos: AtendimentoTituloResumo[],
  titulosVencidos: AtendimentoTituloResumo[],
  dataReferencia?: string,
): AtendimentoTituloResumo[] {
  const byId = new Map<string, AtendimentoTituloResumo>();
  for (const t of [...titulosVencidos, ...titulosAbertos]) {
    if (isVencido(t, dataReferencia)) byId.set(t.id, t);
  }
  return [...byId.values()].sort((a, b) => a.numeroParcela - b.numeroParcela);
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Converte itens da memória da API (componente INADIMPLENCIA_VP) para exibição no card. */
export function agregadoFromMemoriaItens(
  itens: MemoriaCalculoItem[] | undefined,
): InadimplenciaPresenteAgregado | null {
  if (!itens?.length) return null;
  const rows = itens.filter((i) => i.componente === "INADIMPLENCIA_VP");
  if (rows.length === 0) return null;

  const parsed: MemorialCalculoResult[] = rows.map((r) => ({
    valorNominal: num(r.valorNominal),
    vencimento: r.vencimento?.slice(0, 10) ?? "",
    dataCalculo: hojeNegocioIso(),
    diasAtraso: num(r.diasAtraso),
    multaPercentual: num(r.multaPercentual) || 2,
    jurosMensalPercentual: num(r.jurosMensalPercentual) || 1,
    valorMulta: num(r.valorMulta),
    valorJuros: num(r.valorJuros),
    valorAtualizado: num(r.valorPresente),
  }));

  const nominalTotal = parsed.reduce((s, i) => s + i.valorNominal, 0);
  const multaTotal = parsed.reduce((s, i) => s + i.valorMulta, 0);
  const jurosTotal = parsed.reduce((s, i) => s + i.valorJuros, 0);
  const valorPresenteTotal = parsed.reduce((s, i) => s + i.valorAtualizado, 0);

  return {
    nominalTotal: Math.round(nominalTotal * 100) / 100,
    multaTotal: Math.round(multaTotal * 100) / 100,
    jurosTotal: Math.round(jurosTotal * 100) / 100,
    valorPresenteTotal: Math.round(valorPresenteTotal * 100) / 100,
    memoriaCalculo: formatMemoriaAgregada(
      nominalTotal,
      multaTotal,
      jurosTotal,
      valorPresenteTotal,
      parsed.length,
    ),
    itens: parsed,
  };
}

/**
 * Monta inadimplência VP para o card: prioriza títulos vencidos do painel (cálculo correto);
 * usa itens da API só quando coerentes.
 */
export function agregadoInadimplenciaParaExibicao(
  financeiro: { titulosAbertos: AtendimentoTituloResumo[]; titulosVencidos: AtendimentoTituloResumo[] } | null,
  encargos: BoletoEncargosConfig | null,
  parcelaInicial: number,
  memoriaItens?: MemoriaCalculoItem[],
  totalAnteriorReferencia?: number,
  dataAcordo?: string,
): InadimplenciaPresenteAgregado | null {
  if (financeiro && encargos) {
    const vencidos = titulosVencidosDoPainel(
      financeiro.titulosAbertos.filter((t) => t.numeroParcela >= parcelaInicial),
      financeiro.titulosVencidos.filter((t) => t.numeroParcela >= parcelaInicial),
      dataAcordo,
    );
    const agg = agregarInadimplenciaPresente(vencidos, encargos, dataAcordo);
    if (agg.valorPresenteTotal > 0) return agg;
  }

  const fromApi = agregadoFromMemoriaItens(memoriaItens);
  if (!fromApi || fromApi.valorPresenteTotal <= 0) return null;

  const ref = totalAnteriorReferencia ?? 0;
  if (ref > 0 && fromApi.valorPresenteTotal >= ref * 0.85) {
    return null;
  }
  return fromApi;
}

export { fetchBoletoEncargosConfig };
