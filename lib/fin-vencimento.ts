/** Piso da referência na emissão: nunca antes de hoje (títulos legados com vencimento antigo). */
export function referenciaEfetivaParaEmissao(referencia: Date): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ref = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return ref.getTime() > hoje.getTime() ? ref : hoje;
}

/** Próxima data no dia do contrato, na referência ou depois (dia 10 com ref. dia 10 → aceita; ref. dia 11 → mês seguinte). */
export function calcularProximoVencimentoBruto(diaVencimento: number, referencia: Date): Date {
  const ref = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  let year = ref.getFullYear();
  let month = ref.getMonth();

  for (let i = 0; i < 120; i++) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(diaVencimento, lastDay);
    const candidate = new Date(year, month, day);
    if (candidate.getTime() >= ref.getTime()) {
      return candidate;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  throw new Error("Não foi possível calcular o próximo vencimento.");
}

/** Sábado → segunda; domingo → segunda. */
export function ajustarParaProximoDiaUtil(data: Date): Date {
  const day = data.getDay();
  if (day === 6) return new Date(data.getFullYear(), data.getMonth(), data.getDate() + 2);
  if (day === 0) return new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1);
  return data;
}

export function calcularProximoVencimento(diaVencimento: number, referencia: Date): Date {
  return ajustarParaProximoDiaUtil(calcularProximoVencimentoBruto(diaVencimento, referencia));
}

export type VencimentoParcelaDetalhe = {
  vencimento: Date;
  vencimentoBruto: Date;
  ajustadoPorDiaUtil: boolean;
};

export function calcularVencimentosParcelasDetalhe(
  diaVencimento: number,
  referencia: Date,
  quantidade: number,
): VencimentoParcelaDetalhe[] {
  if (quantidade < 1) return [];
  const vencimentos: VencimentoParcelaDetalhe[] = [];
  let cursor = referenciaEfetivaParaEmissao(referencia);
  for (let i = 0; i < quantidade; i++) {
    const bruto = calcularProximoVencimentoBruto(diaVencimento, cursor);
    const venc = ajustarParaProximoDiaUtil(bruto);
    vencimentos.push({
      vencimento: venc,
      vencimentoBruto: bruto,
      ajustadoPorDiaUtil: formatIsoDate(bruto) !== formatIsoDate(venc),
    });
    cursor = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate() + 1);
  }
  return vencimentos;
}

/** 1ª parcela na data informada; demais no dia de vencimento mensal do contrato. */
export function calcularVencimentosComPrimeiraParcelaDetalhe(
  dataPrimeiraParcela: Date,
  diaVencimento: number,
  quantidade: number,
): VencimentoParcelaDetalhe[] {
  if (quantidade < 1) return [];
  const vencimentos: VencimentoParcelaDetalhe[] = [];
  const brutoPrimeira = new Date(
    dataPrimeiraParcela.getFullYear(),
    dataPrimeiraParcela.getMonth(),
    dataPrimeiraParcela.getDate(),
  );
  const vencPrimeira = ajustarParaProximoDiaUtil(brutoPrimeira);
  vencimentos.push({
    vencimento: vencPrimeira,
    vencimentoBruto: brutoPrimeira,
    ajustadoPorDiaUtil: formatIsoDate(brutoPrimeira) !== formatIsoDate(vencPrimeira),
  });
  let cursor = new Date(
    vencPrimeira.getFullYear(),
    vencPrimeira.getMonth(),
    vencPrimeira.getDate() + 1,
  );
  for (let i = 1; i < quantidade; i++) {
    const bruto = calcularProximoVencimentoBruto(diaVencimento, cursor);
    const venc = ajustarParaProximoDiaUtil(bruto);
    vencimentos.push({
      vencimento: venc,
      vencimentoBruto: bruto,
      ajustadoPorDiaUtil: formatIsoDate(bruto) !== formatIsoDate(venc),
    });
    cursor = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate() + 1);
  }
  return vencimentos;
}

/** Rótulo curto do dia da semana do vencimento bruto (ex.: "sáb."). */
export function diaSemanaCurto(data: Date): string {
  const nome = data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function calcularVencimentosParcelas(
  diaVencimento: number,
  referencia: Date,
  quantidade: number,
): Date[] {
  return calcularVencimentosParcelasDetalhe(diaVencimento, referencia, quantidade).map(
    (item) => item.vencimento,
  );
}

function vencimentoAjustadoNoMes(ano: number, mes: number, diaContrato: number): Date {
  const lastDay = new Date(ano, mes, 0).getDate();
  const diaEfetivo = Math.min(diaContrato, lastDay);
  return ajustarParaProximoDiaUtil(new Date(ano, mes - 1, diaEfetivo));
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Dia do contrato no mês, deslocado para segunda se cair em sábado ou domingo. */
export function vencimentoCorrespondeAoDiaContrato(vencimento: Date, diaContrato: number): boolean {
  if (diaContrato < 1 || diaContrato > 31) return false;
  const v = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  const noMes = vencimentoAjustadoNoMes(v.getFullYear(), v.getMonth() + 1, diaContrato);
  if (sameCalendarDay(v, noMes)) return true;
  const mesAnterior = new Date(v.getFullYear(), v.getMonth() - 1, 1);
  const noMesAnterior = vencimentoAjustadoNoMes(
    mesAnterior.getFullYear(),
    mesAnterior.getMonth() + 1,
    diaContrato,
  );
  return sameCalendarDay(v, noMesAnterior);
}

export function inicioDoDiaHoje(): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

/** Meia-noite local do dia civil (ignora hora/fuso no valor recebido). */
export function normalizarDataCalendario(data: Date | null | undefined): Date | null {
  if (!data || Number.isNaN(data.getTime())) return null;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Compara apenas o dia civil (YYYY-MM-DD), sem hora. */
export function compararDiaCalendario(a: Date, b: Date): number {
  const da = formatIsoDate(a);
  const db = formatIsoDate(b);
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
}

/** Hoje ou posterior (sem validar dia do contrato). */
export function isVencimentoFuturo(vencimento: Date): boolean {
  const v = normalizarDataCalendario(vencimento);
  if (!v) return false;
  return compararDiaCalendario(v, new Date()) >= 0;
}

/** Vencimento da 1ª parcela deste lote: hoje ou posterior (data livre). */
export function isVencimentoValidoParaNovoTitulo(vencimento: Date): boolean {
  return isVencimentoFuturo(vencimento);
}

export function isVencimentoValidoParaContrato(vencimento: Date, diaContrato: number): boolean {
  if (!isVencimentoFuturo(vencimento)) return false;
  return vencimentoCorrespondeAoDiaContrato(vencimento, diaContrato);
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Dias civis entre duas datas ISO (início exclusivo, fim inclusivo como ChronoUnit.DAYS.between).
 * Usa UTC para não depender do fuso/DST do navegador — alinhado a TituloMemorialCalculo.java.
 */
export function diasEntreDatasIso(de: string, ate: string): number {
  const [y1, m1, d1] = de.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = ate.slice(0, 10).split("-").map(Number);
  const diff = Math.floor((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
  return Math.max(0, diff);
}

/** Data de pagamento (Instant ISO da API) como dia civil — evita deslocamento de fuso na exibição. */
export function formatDataPagamentoExibicao(iso: string | null | undefined): string {
  if (!iso) return "—";
  const part = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    } catch {
      return iso;
    }
  }
  return parseIsoDate(part).toLocaleDateString("pt-BR");
}
