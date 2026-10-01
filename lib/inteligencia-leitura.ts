import { apiFetch } from "@/lib/api-fetch";
import {
  getAtendimentoInteligenciaAcaoUrl,
  getAtendimentoInteligenciaDecisaoUrl,
  getAtendimentoInteligenciaUrl,
} from "@/lib/api-config";
import type { RealtimeMessage } from "@/lib/realtime-socket";

export const INTELIGENCIA_LEITURA_WS_TYPE = "INTELIGENCIA_LEITURA";

export type InteligenciaOpcao = {
  codigo: string;
  rotulo: string;
  intencao: string;
  evidencia: string;
  checar: string;
};

export type InteligenciaIndicador = {
  nome: string;
  janela: string;
  valor: string;
};

export type InteligenciaConteudo = {
  pacote: string;
  estimativa: string;
  cobertura: string;
  coberturaMotivo: string;
  tendencia: string;
  vencidoEmAberto: number;
  saldo: number;
  temBalao: boolean;
  correcao: string;
  outrosContratos: number;
  propensao: string;
  horizontePermanencia: string;
  horizonteAcordo: string;
  risco: string;
  caracteristicas: string[];
  indicadores: InteligenciaIndicador[];
  opcoes: InteligenciaOpcao[];
  limites: string[];
  whatsappPermitido: boolean;
  texto: string;
};

export type InteligenciaCaso = {
  id: string;
  decisao: string;
  codigoOpcao: string | null;
  ajuste: string | null;
  motivo: string | null;
  decididoEm: string;
  acao: string | null;
  referencia: string | null;
  divergente: boolean;
  acaoEm: string | null;
};

export type InteligenciaLeitura = {
  id: string;
  contratoId: number;
  vigente: boolean;
  leitura: InteligenciaConteudo;
  caso: InteligenciaCaso | null;
};

export function isInteligenciaLeituraEvent(
  data: RealtimeMessage,
): data is { type: typeof INTELIGENCIA_LEITURA_WS_TYPE; tenantId: number; contratoId: number } {
  return data.type === INTELIGENCIA_LEITURA_WS_TYPE && typeof data.contratoId === "number";
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Não foi possível ler a inteligência do contrato.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function obterInteligenciaLeitura(contratoId: number): Promise<InteligenciaLeitura> {
  const res = await apiFetch(getAtendimentoInteligenciaUrl(contratoId));
  return parse(res);
}

export async function decidirInteligencia(
  contratoId: number,
  body: { decisao: string; codigoOpcao?: string; ajuste?: string; motivo?: string },
): Promise<InteligenciaLeitura> {
  const res = await apiFetch(getAtendimentoInteligenciaDecisaoUrl(contratoId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(res);
}

export async function vincularAcaoInteligencia(
  contratoId: number,
  casoId: string,
  body: { tipo: "OCORRENCIA" | "BOLETO" | "RENEGOCIACAO"; referencia: string },
): Promise<InteligenciaLeitura> {
  const res = await apiFetch(getAtendimentoInteligenciaAcaoUrl(contratoId, casoId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(res);
}
