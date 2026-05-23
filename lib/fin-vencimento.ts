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

export function calcularVencimentosParcelas(
  diaVencimento: number,
  referencia: Date,
  quantidade: number,
): Date[] {
  if (quantidade < 1) return [];
  const vencimentos: Date[] = [];
  let cursor = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  for (let i = 0; i < quantidade; i++) {
    const venc = calcularProximoVencimento(diaVencimento, cursor);
    vencimentos.push(venc);
    cursor = venc;
  }
  return vencimentos;
}

export function isVencimentoValidoParaContrato(vencimento: Date, diaContrato: number): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  if (v.getTime() <= hoje.getTime()) return false;
  const lastDay = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
  const diaEfetivo = Math.min(diaContrato, lastDay);
  return v.getDate() === diaEfetivo;
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
