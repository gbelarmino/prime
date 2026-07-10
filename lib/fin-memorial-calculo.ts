import { apiFetch } from "./api-fetch";
import { getParametroByNomeUrl } from "./api-config";

import { hojeNegocioIso } from "./app-business-date";
import { diasEntreDatasIso } from "./fin-vencimento";

export const PARAM_MULTA = "FIN_BOLETO_MULTA_PERCENTUAL";
export const PARAM_JUROS_MENSAL = "FIN_BOLETO_JUROS_MENSAL";

const DEFAULT_MULTA_PERCENT = 2;
const DEFAULT_JUROS_MENSAL_PERCENT = 1;
const DIAS_MES_JUROS_PRO_RATA = 30;

export interface BoletoEncargosConfig {
  multaPercentual: number;
  jurosMensalPercentual: number;
}

export interface MemorialCalculoTitulo {
  valorNominal: number;
  vencimento: string;
  dataCalculo?: string;
}

export interface MemorialCalculoResult {
  valorNominal: number;
  vencimento: string;
  dataCalculo: string;
  diasAtraso: number;
  multaPercentual: number;
  jurosMensalPercentual: number;
  valorMulta: number;
  valorJuros: number;
  valorAtualizado: number;
}

function parsePercentParam(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseFloat(raw.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function todayIso(): string {
  return hojeNegocioIso();
}

function diasAtraso(vencimento: string, dataCalculo: string): number {
  return diasEntreDatasIso(vencimento, dataCalculo);
}

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

export async function fetchBoletoEncargosConfig(): Promise<BoletoEncargosConfig> {
  const config: BoletoEncargosConfig = {
    multaPercentual: DEFAULT_MULTA_PERCENT,
    jurosMensalPercentual: DEFAULT_JUROS_MENSAL_PERCENT,
  };

  try {
    const [rMulta, rJuros] = await Promise.all([
      apiFetch(getParametroByNomeUrl(PARAM_MULTA), { skipLoading: true }),
      apiFetch(getParametroByNomeUrl(PARAM_JUROS_MENSAL), { skipLoading: true }),
    ]);
    if (rMulta.ok) {
      const p = (await rMulta.json()) as { valor?: string };
      config.multaPercentual = parsePercentParam(p.valor, DEFAULT_MULTA_PERCENT);
    }
    if (rJuros.ok) {
      const p = (await rJuros.json()) as { valor?: string };
      config.jurosMensalPercentual = parsePercentParam(p.valor, DEFAULT_JUROS_MENSAL_PERCENT);
    }
  } catch {
    /* mantém defaults */
  }

  return config;
}

export function calcularMemorialTitulo(
  titulo: MemorialCalculoTitulo,
  encargos: BoletoEncargosConfig,
): MemorialCalculoResult {
  const dataCalculo = titulo.dataCalculo ?? todayIso();
  const dias = diasAtraso(titulo.vencimento, dataCalculo);
  const nominal = titulo.valorNominal;

  const valorMulta =
    dias > 0 ? roundMoney((nominal * encargos.multaPercentual) / 100) : 0;
  const valorJuros =
    dias > 0
      ? roundMoney(
          (nominal * encargos.jurosMensalPercentual * dias) /
            (100 * DIAS_MES_JUROS_PRO_RATA),
        )
      : 0;

  return {
    valorNominal: nominal,
    vencimento: titulo.vencimento,
    dataCalculo,
    diasAtraso: dias,
    multaPercentual: encargos.multaPercentual,
    jurosMensalPercentual: encargos.jurosMensalPercentual,
    valorMulta,
    valorJuros,
    valorAtualizado: roundMoney(nominal + valorMulta + valorJuros),
  };
}
