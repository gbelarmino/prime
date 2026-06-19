import { isParcelaReajuste } from "@/lib/fin-parcela-reajuste";
import {
  mesCorteIndiceReajuste,
  mesesIpcaParaReajuste,
  parcelaReajusteDoCiclo,
  vencimentoProjetadoParcela,
} from "@/lib/fin-valor-nominal";

export type AvisoSerieIndiceIncompleta = {
  tipo: "IGPM" | "IPCA";
  inicio: string;
  fim: string;
  mesesNecessarios: number;
  mesesEncontrados: number;
  ultimoMesSincronizado: string;
  indicesFuturos: boolean;
};

export type ResumoCalculoIndice = {
  parcelaReajusteCiclo: number | null;
  ehParcelaReajuste: boolean;
  tipoIndice: string | null;
  vencimentoReajusteLabel: string | null;
  janelaIndiceLabel: string | null;
  ultimoMesSincronizado: string | null;
  indicesFuturosPendentes: boolean;
  calculoAutomaticoIndisponivel: boolean;
  tituloBanner: string | null;
  detalheBanner: string | null;
  dicaAcao: string;
  linkIndices: string | null;
  avisoResumidoLinha: string | null;
};

const AVISO_SERIE_RE =
  /^Série (IGPM|IPCA) incompleta de (\d{4}-\d{2}) a (\d{4}-\d{2}) \(necessário (\d+) meses, encontrados (\d+)\)\. Último mês sincronizado: ([^.]+)\./;

function subtractAnoMes(anoMes: number, meses: number): number {
  const year = Math.floor(anoMes / 100);
  const month = anoMes % 100;
  const d = new Date(year, month - 1, 1);
  d.setMonth(d.getMonth() - meses);
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

function formatAnoMesLabel(anoMes: number): string {
  const year = Math.floor(anoMes / 100);
  const month = anoMes % 100;
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

function formatAnoMesIso(anoMes: number): string {
  const year = Math.floor(anoMes / 100);
  const month = String(anoMes % 100).padStart(2, "0");
  return `${year}-${month}`;
}

function parseAnoMesIso(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 100 + m;
}

function labelTipoIndice(tipo: string | null | undefined): string | null {
  if (!tipo || tipo === "NENHUM") return null;
  if (tipo === "IGPM") return "IGP-M";
  if (tipo === "IPCA") return "IPCA";
  return tipo;
}

export function parseAvisoSerieIndiceIncompleta(aviso: string): AvisoSerieIndiceIncompleta | null {
  const m = aviso.trim().match(AVISO_SERIE_RE);
  if (!m) return null;
  return {
    tipo: m[1] as "IGPM" | "IPCA",
    inicio: m[2]!,
    fim: m[3]!,
    mesesNecessarios: Number(m[4]),
    mesesEncontrados: Number(m[5]),
    ultimoMesSincronizado: m[6]!.trim(),
    indicesFuturos:
      aviso.includes("índices futuros") ||
      aviso.includes("futuros ainda não publicados"),
  };
}

export function linkFinanceiroIndice(tipo: string | null | undefined): string | null {
  if (tipo === "IGPM") return "/dashboard/financeiro/indices-igpm";
  if (tipo === "IPCA") return "/dashboard/financeiro/indices-ipca";
  return null;
}

export function resumirAvisoIndiceLinha(aviso: string): string {
  const parsed = parseAvisoSerieIndiceIncompleta(aviso);
  if (!parsed) return aviso;
  const label = labelTipoIndice(parsed.tipo) ?? parsed.tipo;
  const faltam = parsed.mesesNecessarios - parsed.mesesEncontrados;
  if (parsed.indicesFuturos) {
    return `${label} incompleto (${parsed.mesesEncontrados}/${parsed.mesesNecessarios} meses). Índices futuros — informe o valor manualmente.`;
  }
  return `${label} incompleto — faltam ${faltam} mês(es). Sincronize em Financeiro → ${label}.`;
}

export function buildResumoCalculoIndice(input: {
  parcela: number | null;
  dataPrimeiraParcela: Date | null;
  diaVencimento: number | null;
  quantidadeParcelasFracionadas: number | null;
  tipoCorrecaoAnual: string | null | undefined;
  vencimentoEmissao: Date | null;
  avisoBackend?: string | null;
}): ResumoCalculoIndice | null {
  const {
    parcela,
    dataPrimeiraParcela,
    diaVencimento,
    quantidadeParcelasFracionadas,
    tipoCorrecaoAnual,
    vencimentoEmissao,
    avisoBackend,
  } = input;

  const tipoIndice = labelTipoIndice(tipoCorrecaoAnual ?? null);
  const parsedAviso = avisoBackend ? parseAvisoSerieIndiceIncompleta(avisoBackend) : null;
  const dicaAcao =
    "Informe o valor nominal manualmente em cada lote ou aguarde a publicação dos índices faltantes.";

  if (parcela == null || parcela < 1) return null;

  const parcelaReajusteCiclo = parcela >= 13 ? parcelaReajusteDoCiclo(parcela) : null;
  const ehParcelaReajuste = isParcelaReajuste(parcela);

  let vencimentoReajusteLabel: string | null = null;
  let janelaIndiceLabel: string | null = null;
  let indicesFuturosPendentes = parsedAviso?.indicesFuturos ?? false;

  if (
    parcelaReajusteCiclo != null &&
    dataPrimeiraParcela &&
    diaVencimento != null &&
    tipoIndice
  ) {
    const usaVencimentoEmissao =
      parcela === parcelaReajusteCiclo && vencimentoEmissao != null;
    const vencimentoReajuste = usaVencimentoEmissao
      ? vencimentoEmissao
      : vencimentoProjetadoParcela(parcelaReajusteCiclo, dataPrimeiraParcela, diaVencimento);

    vencimentoReajusteLabel = vencimentoReajuste.toLocaleDateString("pt-BR");

    const qtdFracionadas = quantidadeParcelasFracionadas ?? 0;
    const mesesIndice = mesesIpcaParaReajuste(parcelaReajusteCiclo, qtdFracionadas);
    const fimAnoMes = mesCorteIndiceReajuste(vencimentoReajuste);
    const inicioAnoMes = subtractAnoMes(fimAnoMes, mesesIndice - 1);
    janelaIndiceLabel = `${formatAnoMesLabel(inicioAnoMes)} a ${formatAnoMesLabel(fimAnoMes)}`;

    if (!parsedAviso) {
      const fimIso = formatAnoMesIso(fimAnoMes);
      const now = new Date();
      const fimDate = new Date(
        Math.floor(fimAnoMes / 100),
        (fimAnoMes % 100) - 1,
        1,
      );
      indicesFuturosPendentes =
        fimDate.getFullYear() > now.getFullYear() ||
        (fimDate.getFullYear() === now.getFullYear() &&
          fimDate.getMonth() > now.getMonth());
    }
  }

  const calculoAutomaticoIndisponivel =
    parsedAviso != null || (ehParcelaReajuste && indicesFuturosPendentes && !!tipoIndice);

  if (!calculoAutomaticoIndisponivel && !ehParcelaReajuste) {
    return null;
  }

  const indiceRef = parsedAviso?.tipo ?? tipoCorrecaoAnual ?? null;
  const linkIndices = linkFinanceiroIndice(indiceRef);

  let tituloBanner: string | null = null;
  let detalheBanner: string | null = null;

  if (ehParcelaReajuste && tipoIndice) {
    tituloBanner = `Parcela ${parcela} = reajuste anual (${tipoIndice})`;
    const partes: string[] = [];
    if (janelaIndiceLabel) {
      partes.push(
        `O valor usa 6% + ${tipoIndice} acumulado de ${janelaIndiceLabel}.`,
      );
    }
    if (vencimentoReajusteLabel) {
      partes.push(`Vencimento de referência do ciclo: ${vencimentoReajusteLabel}.`);
    }
    if (parsedAviso) {
      partes.push(
        `Série incompleta: ${parsedAviso.mesesEncontrados} de ${parsedAviso.mesesNecessarios} meses (${parsedAviso.inicio} a ${parsedAviso.fim}). Último mês sincronizado: ${parsedAviso.ultimoMesSincronizado}.`,
      );
      if (parsedAviso.indicesFuturos) {
        partes.push(
          `Parte do período ainda não foi publicada — sincronizar o IGP-M agora não resolve.`,
        );
      }
    } else if (indicesFuturosPendentes && janelaIndiceLabel) {
      partes.push(
        `Parte da janela (${janelaIndiceLabel}) ainda depende de índices futuros; o cálculo automático pode falhar até a publicação completa.`,
      );
    }
    detalheBanner = partes.join(" ");
  } else if (parsedAviso) {
    tituloBanner = `Série ${labelTipoIndice(parsedAviso.tipo) ?? parsedAviso.tipo} incompleta`;
    detalheBanner = avisoBackend ?? null;
  }

  const avisoResumidoLinha = avisoBackend ? resumirAvisoIndiceLinha(avisoBackend) : null;

  return {
    parcelaReajusteCiclo,
    ehParcelaReajuste,
    tipoIndice,
    vencimentoReajusteLabel,
    janelaIndiceLabel,
    ultimoMesSincronizado: parsedAviso?.ultimoMesSincronizado ?? null,
    indicesFuturosPendentes,
    calculoAutomaticoIndisponivel,
    tituloBanner,
    detalheBanner,
    dicaAcao,
    linkIndices,
    avisoResumidoLinha,
  };
}

/** Rótulo curto da janela a partir do aviso do backend (ex.: "2026-01 a 2026-12" → "jan/2026 a dez/2026"). */
export function formatJanelaIndiceDoAviso(inicio: string, fim: string): string {
  return `${formatAnoMesLabel(parseAnoMesIso(inicio))} a ${formatAnoMesLabel(parseAnoMesIso(fim))}`;
}
