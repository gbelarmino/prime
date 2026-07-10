import type { AtendimentoTituloResumo } from "@/lib/atendimento-service";
import type { BoletoEncargosConfig } from "@/lib/fin-memorial-calculo";
import { hojeNegocioIso } from "@/lib/app-business-date";
import {
  agregarInadimplenciaPresente,
  titulosVencidosDoPainel,
} from "@/lib/renegociacao-inadimplencia-presente";
import { aplicarDescontoQuitacao } from "@/lib/renegociacao-quitacao-calculo";

export const PAPEL_VENCIDA = "VENCIDA";
export const PAPEL_VINCENDA_REEMITIDA = "VINCENDA_REEMITIDA";

export type T1ParcelaComposta = {
  numeroParcela: number;
  vencimento: string;
  valorVigente: number;
  valorAcordo: number;
  valorComposto: number;
};

export type T1PreviewResultado = {
  vpTotal: number;
  totalAcordo: number;
  parcelaAcordoMedia: number;
  quantidadeParcelas: number;
  primeiraVincenda: number;
  ultimaVincendaAcoplada: number;
  vencidas: AtendimentoTituloResumo[];
  vincendasReemitir: AtendimentoTituloResumo[];
  cronograma: T1ParcelaComposta[];
  avisos: string[];
  erro?: string;
};

function isVincenda(t: AtendimentoTituloResumo, hoje: string): boolean {
  return (
    t.vencimento >= hoje &&
    t.status !== "PAGO" &&
    t.status !== "CANCELADO" &&
    t.status !== "RASCUNHO"
  );
}

function dividirEmParcelas(total: number, qtd: number): number[] {
  if (qtd <= 0) return [];
  const base = Math.round((total / qtd) * 100) / 100;
  const out: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < qtd; i++) {
    const valor =
      i === qtd - 1 ? Math.round((total - acumulado) * 100) / 100 : base;
    acumulado += valor;
    out.push(valor);
  }
  return out;
}

export function previewT1Acordo(options: {
  titulosAbertos: AtendimentoTituloResumo[];
  titulosVencidos: AtendimentoTituloResumo[];
  encargos: BoletoEncargosConfig;
  parcelaInicial: number;
  quantidadeParcelas: number;
  pctDesconto?: number | null;
  vlDesconto?: number | null;
  dataAcordo?: string;
}): T1PreviewResultado {
  const hoje = options.dataAcordo ?? hojeNegocioIso();
  const filtro = options.parcelaInicial ?? 1;
  const n = Math.max(1, options.quantidadeParcelas ?? 1);

  const todos = titulosVencidosDoPainel(
    options.titulosAbertos,
    options.titulosVencidos,
    hoje,
  );
  const vencidas = todos
    .filter((t) => t.numeroParcela >= filtro)
    .sort((a, b) => a.numeroParcela - b.numeroParcela);

  if (vencidas.length === 0) {
    return {
      vpTotal: 0,
      totalAcordo: 0,
      parcelaAcordoMedia: 0,
      quantidadeParcelas: n,
      primeiraVincenda: 0,
      ultimaVincendaAcoplada: 0,
      vencidas: [],
      vincendasReemitir: [],
      cronograma: [],
      avisos: [],
      erro: "Não há títulos vencidos na faixa informada. Use parcela inicial 1 para incluir toda a mora.",
    };
  }

  const inad = agregarInadimplenciaPresente(vencidas, options.encargos, hoje);
  const vpTotal = inad.valorPresenteTotal;
  const totalAcordo = aplicarDescontoQuitacao(
    vpTotal,
    options.pctDesconto,
    options.vlDesconto,
  );

  const vincendas = options.titulosAbertos
    .filter((t) => isVincenda(t, hoje))
    .sort((a, b) => a.numeroParcela - b.numeroParcela);

  if (vincendas.length < n) {
    return {
      vpTotal,
      totalAcordo,
      parcelaAcordoMedia: 0,
      quantidadeParcelas: n,
      primeiraVincenda: 0,
      ultimaVincendaAcoplada: 0,
      vencidas,
      vincendasReemitir: [],
      cronograma: [],
      avisos: [],
      erro: `Acordo em ${n} parcelas exige ${n} vincenda(s); há apenas ${vincendas.length} disponível(is).`,
    };
  }

  const vincendasReemitir = vincendas.slice(0, n);
  const parcelasAcordo = dividirEmParcelas(totalAcordo, n);
  const cronograma: T1ParcelaComposta[] = vincendasReemitir.map((t, i) => {
    const vigente = t.valorNominal ?? 0;
    const acordo = parcelasAcordo[i] ?? 0;
    return {
      numeroParcela: t.numeroParcela,
      vencimento: t.vencimento,
      valorVigente: vigente,
      valorAcordo: acordo,
      valorComposto: Math.round((vigente + acordo) * 100) / 100,
    };
  });

  const parcelaAcordoMedia = Math.round((totalAcordo / n) * 100) / 100;
  const primeira = vincendasReemitir[0]!.numeroParcela;
  const ultima = vincendasReemitir[vincendasReemitir.length - 1]!.numeroParcela;

  const avisos = [
    `Passo 1: ${vencidas.length} parcela(s) vencida(s) totalizam ${formatBrl(vpTotal)} a valor presente (nominal + multa + juros).`,
    `Passo 2: acordo de ${formatBrl(totalAcordo)} dividido em ${n} × ${formatBrl(parcelaAcordoMedia)} (mora por parcela).`,
    `Passo 3: somar mora às vincendas ${primeira}–${ultima} (ex.: vigente + acordo = valor do boleto).`,
    `Efetivação: cancelar ${vencidas.length} vencida(s) e reemitir ${n} vincenda(s) com valor composto.`,
    ...(inad.memoriaCalculo ? [`Memória VP: ${inad.memoriaCalculo}`] : []),
    `Parcelas após a ${ultima} permanecem no valor contratual original.`,
  ];

  return {
    vpTotal,
    totalAcordo,
    parcelaAcordoMedia,
    quantidadeParcelas: n,
    primeiraVincenda: primeira,
    ultimaVincendaAcoplada: ultima,
    vencidas,
    vincendasReemitir,
    cronograma,
    avisos,
  };
}

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
