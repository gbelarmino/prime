import { parseMoneyBrl } from "@/lib/currency-brl";
import {
  calcularVencimentosComPrimeiraParcelaDetalhe,
  formatIsoDate,
  parseIsoDate,
} from "@/lib/fin-vencimento";
import type { BalaoContratoFormRow } from "@/lib/validations/contrato-honorarios";

export type BalaoContratoApiItem = {
  ordem: number;
  valor: number | null;
  parcelaReferencia: number;
  reajusteIndice?: boolean | null;
};

export type BalaoContratoPreviewRow = {
  ordem: number;
  valor: number | null;
  valorLabel: string;
  parcelaReferencia: number;
  vencimento: string | null;
  vencimentoLabel: string;
  indiceLabel: string;
};

export const TIPO_CORRECAO_INDICE_OPTIONS = [
  { label: "IGPM", value: "IGPM" },
  { label: "IPCA", value: "IPCA" },
  { label: "INPC", value: "INPC" },
  { label: "Nenhum", value: "NENHUM" },
] as const;

export function labelIndiceReferencia(tipoCorrecaoAnual: string | undefined | null): string {
  const opt = TIPO_CORRECAO_INDICE_OPTIONS.find((o) => o.value === tipoCorrecaoAnual);
  return opt?.label ?? "—";
}

function optionalInt(s: string | undefined): number | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function emptyBalaoRow(ordem: number): BalaoContratoFormRow {
  return { ordem, valor: "", parcelaReferencia: "", reajusteIndice: "" };
}

export function reindexBaloes(rows: BalaoContratoFormRow[]): BalaoContratoFormRow[] {
  return rows.map((r, i) => ({ ...r, ordem: i + 1 }));
}

export function baloesApiToForm(
  items: BalaoContratoApiItem[] | null | undefined,
): BalaoContratoFormRow[] {
  if (!items?.length) return [];
  return [...items]
    .sort((a, b) => a.ordem - b.ordem)
    .map((b) => ({
      ordem: b.ordem,
      valor:
        b.ordem === 1 && b.valor != null && b.valor > 0
          ? b.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "",
      parcelaReferencia: String(b.parcelaReferencia),
      reajusteIndice: "",
    }));
}

export function baloesFormToApi(rows: BalaoContratoFormRow[]): BalaoContratoApiItem[] {
  const out: BalaoContratoApiItem[] = [];
  for (const r of rows) {
    const parcelaReferencia = optionalInt(r.parcelaReferencia);
    if (parcelaReferencia == null || parcelaReferencia < 1) {
      continue;
    }
    if (r.ordem === 1) {
      const valor = parseMoneyBrl(r.valor);
      if (valor == null || valor <= 0) {
        continue;
      }
      out.push({ ordem: 1, valor, parcelaReferencia, reajusteIndice: null });
      continue;
    }
    out.push({ ordem: r.ordem, valor: null, parcelaReferencia, reajusteIndice: null });
  }
  return out.sort((a, b) => a.ordem - b.ordem);
}

/** Espelha {@code BaloesContratoValidator} no backend. */
export function validarBaloesForm(
  rows: BalaoContratoFormRow[],
  numParcelasMensais: string | undefined,
): string | null {
  const numMax = optionalInt(numParcelasMensais);
  const ativos = rows.filter(
    (r) => r.parcelaReferencia.trim() || (r.ordem === 1 && r.valor.trim()),
  );
  if (ativos.length === 0) return null;

  const ordenados = [...ativos].sort((a, b) => a.ordem - b.ordem);
  let expectedOrdem = 1;
  let prevReferencia = 0;

  for (const row of ordenados) {
    if (row.ordem !== expectedOrdem) {
      return "Balões: ordem deve ser sequencial (1, 2, 3…) sem lacunas.";
    }
    if (row.ordem === 1) {
      const valor = parseMoneyBrl(row.valor);
      if (valor == null || valor <= 0) {
        return "Balão 1: valor deve ser maior que zero.";
      }
    }
    const ref = optionalInt(row.parcelaReferencia);
    if (ref == null || ref < 1) {
      return `Balão ${row.ordem}: informe a parcela mensal de referência.`;
    }
    if (numMax != null && numMax > 0 && ref > numMax) {
      return `Balão ${row.ordem}: parcela de referência (${ref}) excede o total de parcelas mensais (${numMax}).`;
    }
    if (ref <= prevReferencia) {
      return "Balões: parcela de referência deve ser estritamente crescente (ex.: 1, 15, 23).";
    }
    prevReferencia = ref;
    expectedOrdem++;
  }
  return null;
}

export function previewBaloesContrato(opts: {
  baloes: BalaoContratoFormRow[];
  numParcelasMensais: string;
  dataPrimeiraParcela: string;
  diaVencimento: string;
  tipoCorrecaoAnual?: string;
}): BalaoContratoPreviewRow[] {
  const api = baloesFormToApi(opts.baloes);
  if (api.length === 0) return [];

  const indiceLabel = labelIndiceReferencia(opts.tipoCorrecaoAnual);
  const valorB1 = api.find((b) => b.ordem === 1)?.valor ?? null;

  const dia = optionalInt(opts.diaVencimento);
  const numMax = optionalInt(opts.numParcelasMensais);
  const dataPrimeira = opts.dataPrimeiraParcela?.trim();
  if (dia == null || dia < 1 || !dataPrimeira || numMax == null || numMax < 1) {
    return api.map((b) => ({
      ordem: b.ordem,
      valor: b.ordem === 1 ? b.valor : null,
      valorLabel: b.ordem === 1 && b.valor != null ? formatBrl(b.valor) : "Calculado na correção",
      parcelaReferencia: b.parcelaReferencia,
      vencimento: null,
      vencimentoLabel: "Informe 1ª parcela e dia de vencimento",
      indiceLabel,
    }));
  }

  let primeira: Date;
  try {
    primeira = parseIsoDate(dataPrimeira);
  } catch {
    return [];
  }

  const cronograma = calcularVencimentosComPrimeiraParcelaDetalhe(primeira, dia, numMax);

  return api.map((b) => {
    const det = cronograma[b.parcelaReferencia - 1];
    const venc = det?.vencimento ?? null;
    const valor = b.ordem === 1 ? b.valor : null;
    return {
      ordem: b.ordem,
      valor,
      valorLabel:
        b.ordem === 1 && valor != null
          ? formatBrl(valor)
          : valorB1 != null
            ? `Calculado (${formatBrl(valorB1)} + ${indiceLabel})`
            : "Calculado na correção",
      parcelaReferencia: b.parcelaReferencia,
      vencimento: venc ? formatIsoDate(venc) : null,
      vencimentoLabel: venc
        ? venc.toLocaleDateString("pt-BR")
        : "Parcela fora do cronograma",
      indiceLabel,
    };
  });
}

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
