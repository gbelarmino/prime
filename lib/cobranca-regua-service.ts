import { apiFetch } from "./api-fetch";
import {
  getFinCobrancaReguaAtivaUrl,
  getFinCobrancaReguaEtapaUrl,
  getFinCobrancaReguaEtapasUrl,
  getFinCobrancaReguaExecucoesUrl,
  getFinCobrancaReguaExecutarJobUrl,
  getFinCobrancaReguaTesteTituloResolvidoUrl,
  getFinCobrancaReguaTesteUrl,
  getFinCobrancaReguaUrl,
} from "./api-config";
import type { SpringPage } from "./spring-page";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Erro HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export type CobrancaReguaCanal = "WHATSAPP" | "EMAIL" | "AMBOS";

export interface CobrancaReguaEtapa {
  id: string;
  nome: string;
  codigo: string;
  ordem: number;
  offsetDias: number;
  offsetLabel: string;
  canal: CobrancaReguaCanal;
  templateWhatsAppId?: string | null;
  templateWhatsAppNome?: string | null;
  templateEmailId?: string | null;
  templateEmailNome?: string | null;
  ativa: boolean;
  anexoPdf: boolean;
}

export interface CobrancaRegua {
  id: string;
  nome: string;
  descricao?: string | null;
  ativa: boolean;
  etapas: CobrancaReguaEtapa[];
}

export interface CobrancaReguaEtapaSavePayload {
  nome?: string;
  codigo?: string;
  ordem: number;
  offsetDias: number;
  canal: CobrancaReguaCanal;
  templateWhatsAppId?: string | null;
  templateEmailId?: string | null;
  ativa?: boolean;
  anexoPdf?: boolean;
}

export interface CobrancaReguaMotorResult {
  etapasAvaliadas: number;
  titulosElegiveis: number;
  enfileiradosWhatsApp: number;
  enfileiradosEmail: number;
  ignorados: number;
  falhas: number;
}

export interface CobrancaReguaTesteTitulo {
  id: string | null;
  label: string | null;
  doCliente: boolean;
}

export interface CobrancaReguaTesteItem {
  contratanteId: number;
  contratanteNome: string;
  tituloId?: string | null;
  whatsAppEnfileirado: boolean;
  filaWhatsAppId?: number | null;
  mensagemWhatsApp?: string | null;
  emailEnfileirado: boolean;
  filaEmailId?: number | null;
  mensagemEmail?: string | null;
}

export interface CobrancaReguaTesteResult {
  etapaNome: string;
  etapaCodigo: string;
  enfileiradosWhatsApp: number;
  enfileiradosEmail: number;
  ignorados: number;
  itens: CobrancaReguaTesteItem[];
}

export interface CobrancaReguaExecucao {
  id: string;
  tituloId: string;
  etapaId: string;
  etapaNome: string;
  etapaCodigo: string;
  canal: CobrancaReguaCanal;
  status: string;
  filaWhatsAppId?: number | null;
  filaEmailId?: number | null;
  erro?: string | null;
  referenciaVencimento: string;
  executadoEm?: string | null;
  cadastroEm?: string | null;
}

export const cobrancaReguaService = {
  async obterPrincipal(): Promise<CobrancaRegua> {
    const res = await apiFetch(getFinCobrancaReguaUrl());
    return parseJson<CobrancaRegua>(res);
  },

  async definirAtiva(reguaId: string, ativa: boolean): Promise<CobrancaRegua> {
    const res = await apiFetch(getFinCobrancaReguaAtivaUrl(reguaId), {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ ativa }),
    });
    return parseJson<CobrancaRegua>(res);
  },

  async criarEtapa(reguaId: string, payload: CobrancaReguaEtapaSavePayload): Promise<CobrancaReguaEtapa> {
    const res = await apiFetch(getFinCobrancaReguaEtapasUrl(reguaId), {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    return parseJson<CobrancaReguaEtapa>(res);
  },

  async atualizarEtapa(
    reguaId: string,
    etapaId: string,
    payload: CobrancaReguaEtapaSavePayload,
  ): Promise<CobrancaReguaEtapa> {
    const res = await apiFetch(getFinCobrancaReguaEtapaUrl(reguaId, etapaId), {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    return parseJson<CobrancaReguaEtapa>(res);
  },

  async listarExecucoes(page = 0, size = 20): Promise<SpringPage<CobrancaReguaExecucao>> {
    const url = `${getFinCobrancaReguaExecucoesUrl()}?page=${page}&size=${size}&sort=cadastroEm,desc`;
    const res = await apiFetch(url);
    return parseJson<SpringPage<CobrancaReguaExecucao>>(res);
  },

  async executarMotor(): Promise<CobrancaReguaMotorResult> {
    const res = await apiFetch(getFinCobrancaReguaExecutarJobUrl(), { method: "POST" });
    return parseJson<CobrancaReguaMotorResult>(res);
  },

  async resolverTituloTeste(
    contratanteId: number,
    etapaId: string,
  ): Promise<CobrancaReguaTesteTitulo> {
    const res = await apiFetch(getFinCobrancaReguaTesteTituloResolvidoUrl(contratanteId, etapaId), {
      skipLoading: true,
    });
    return parseJson<CobrancaReguaTesteTitulo>(res);
  },

  async dispararTeste(payload: {
    etapaId: string;
    contratanteIds: number[];
    canal: CobrancaReguaCanal;
  }): Promise<CobrancaReguaTesteResult> {
    const body = {
      etapaId: payload.etapaId,
      contratanteIds: payload.contratanteIds,
      canal: payload.canal,
    };
    const res = await apiFetch(getFinCobrancaReguaTesteUrl(), {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
    return parseJson<CobrancaReguaTesteResult>(res);
  },
};
