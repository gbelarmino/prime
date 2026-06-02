/** Piso da referência na emissão: nunca antes de hoje (títulos legados com vencimento antigo). */
export function referenciaEfetivaParaEmissao(referencia: Date): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ref = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return ref.getTime() > hoje.getTime() ? ref : hoje;
}

/** Próxima data de vencimento no dia do mês do contrato, estritamente após `referencia`. */
export function calcularProximoVencimentoBruto(diaVencimento: number, referencia: Date): Date {
  const ref = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  let year = ref.getFullYear();
  let month = ref.getMonth();

  for (let i = 0; i < 120; i++) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(diaVencimento, lastDay);
    const candidate = new Date(year, month, day);
    if (candidate.getTime() > ref.getTime()) {
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
    cursor = venc;
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
  let cursor = vencPrimeira;
  for (let i = 1; i < quantidade; i++) {
    const bruto = calcularProximoVencimentoBruto(diaVencimento, cursor);
    const venc = ajustarParaProximoDiaUtil(bruto);
    vencimentos.push({
      vencimento: venc,
      vencimentoBruto: bruto,
      ajustadoPorDiaUtil: formatIsoDate(bruto) !== formatIsoDate(venc),
    });
    cursor = venc;
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

export function isVencimentoValidoParaContrato(vencimento: Date, diaContrato: number): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  if (v.getTime() <= hoje.getTime()) return false;
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
