import { apiFetch } from "./api-fetch";
import {
  getContratantesListUrl,
  getSmsConfigTesteUrl,
  getSmsConfigUrl,
  getSmsEnvioTesteUrl,
  getSmsEventoPlaceholdersUrl,
  getSmsEventosCatalogoUrl,
  getSmsFilaCancelarUrl,
  getSmsFilaReprocessarUrl,
  getSmsFilaUrl,
  getSmsGatilhosUrl,
  getSmsTemplatesUrl,
  getSmsTesteEventoUrl,
} from "./api-config";
import type { SpringPage } from "./spring-page";

export interface SmsTemplate {
  id?: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  codigoEventoCatalogo?: string | null;
  dataCadastro?: string;
}

export interface SmsTemplateRef {
  id: string;
  nome: string;
}

export interface SmsGatilho {
  id?: string;
  evento: string;
  template?: SmsTemplateRef | null;
  ativo: string;
  dataAlteracao?: string;
}

export interface SmsTextBeeConfig {
  id?: string;
  deviceId: string;
  apiBaseUrl?: string;
  ativo: boolean;
  ultimoTesteEm?: string | null;
  ultimoTesteOk?: boolean | null;
  apiKeyConfigurada?: boolean;
}

export interface EventoSistemaCatalogo {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  ativo: boolean;
}

export interface EventoPlaceholderCatalogo {
  id: string;
  nomeChave: string;
  token: string;
  descricao: string;
  exemplo: string;
  ordem: number;
}

export interface SmsFilaItem {
  id: number;
  telefone: string;
  mensagem: string;
  status: string;
  tentativas: number;
  dataAgendada: string;
  dataEnvio?: string | null;
  dataCriacao: string;
  erro?: string | null;
  externalId?: string | null;
}

type SmsFilaItemRaw = Partial<SmsFilaItem> & {
  destinatario?: string;
  corpo?: string;
};

function normalizeSmsFilaItem(raw: SmsFilaItemRaw): SmsFilaItem {
  return {
    id: raw.id ?? 0,
    telefone: raw.telefone ?? raw.destinatario ?? "",
    mensagem: raw.mensagem ?? raw.corpo ?? "",
    status: raw.status ?? "",
    tentativas: raw.tentativas ?? 0,
    dataAgendada: raw.dataAgendada ?? "",
    dataEnvio: raw.dataEnvio ?? null,
    dataCriacao: raw.dataCriacao ?? "",
    erro: raw.erro ?? null,
    externalId: raw.externalId ?? null,
  };
}

export interface ContratanteListItem {
  id: number;
  nome: string;
  cpf?: string | null;
  cidade?: string | null;
  email?: string | null;
  telefoneCelular1?: string | null;
}

export interface SmsEventoTesteItem {
  contratanteId: number;
  contratanteNome: string;
  enfileirado: boolean;
  filaId?: number | null;
  mensagem?: string | null;
}

export interface SmsEventoTesteResult {
  evento: string;
  eventoDescricao: string;
  enfileirados: number;
  ignorados: number;
  itens: SmsEventoTesteItem[];
}

export const TEXTBEE_API_PRESET = {
  apiBaseUrl: "https://textbee.api.domusparticipacoes.com/api/v1",
};

export const smsService = {
  async getTextBeeConfig(): Promise<SmsTextBeeConfig | null> {
    const res = await apiFetch(getSmsConfigUrl());
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao carregar configuração TextBee");
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as SmsTextBeeConfig;
  },

  async saveTextBeeConfig(payload: {
    deviceId: string;
    apiKey?: string;
    apiBaseUrl?: string;
    ativo: string;
  }): Promise<SmsTextBeeConfig> {
    const res = await apiFetch(getSmsConfigUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Erro ao salvar TextBee";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json();
  },

  async testeTextBee(destino: string, mensagem?: string): Promise<void> {
    const res = await apiFetch(getSmsConfigTesteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destino,
        mensagem: mensagem?.trim() || undefined,
      }),
    });
    if (!res.ok) {
      let msg = "Erro no teste TextBee";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },

  async sendTestMessage(payload: { destino: string; corpo: string }): Promise<void> {
    const res = await apiFetch(getSmsEnvioTesteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destino: payload.destino,
        mensagem: payload.corpo,
      }),
    });
    if (!res.ok) {
      let msg = "Erro ao enviar SMS";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },

  async listTemplates(): Promise<SmsTemplate[]> {
    const res = await apiFetch(getSmsTemplatesUrl());
    if (!res.ok) throw new Error("Erro ao listar modelos");
    return res.json();
  },

  async saveTemplate(template: SmsTemplate): Promise<SmsTemplate> {
    const res = await apiFetch(getSmsTemplatesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error("Erro ao salvar modelo");
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await apiFetch(`${getSmsTemplatesUrl()}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao excluir modelo");
  },

  async listEventosCatalogo(): Promise<EventoSistemaCatalogo[]> {
    const res = await apiFetch(getSmsEventosCatalogoUrl());
    if (!res.ok) throw new Error("Erro ao listar eventos");
    return res.json();
  },

  async listPlaceholdersPorEvento(codigo: string): Promise<EventoPlaceholderCatalogo[]> {
    const res = await apiFetch(getSmsEventoPlaceholdersUrl(codigo));
    if (!res.ok) throw new Error("Erro ao listar placeholders");
    return res.json();
  },

  async listGatilhos(): Promise<SmsGatilho[]> {
    const res = await apiFetch(getSmsGatilhosUrl());
    if (!res.ok) throw new Error("Erro ao listar gatilhos");
    return res.json();
  },

  async saveGatilho(gatilho: SmsGatilho): Promise<SmsGatilho> {
    const body = {
      id: gatilho.id ?? null,
      evento: gatilho.evento,
      templateId: gatilho.template?.id ?? null,
      ativo: gatilho.ativo,
    };
    const res = await apiFetch(getSmsGatilhosUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Erro ao salvar gatilho");
    return res.json();
  },

  async listContratantes(page = 0, size = 100, q = ""): Promise<SpringPage<ContratanteListItem>> {
    const res = await apiFetch(getContratantesListUrl(page, size, q));
    if (!res.ok) throw new Error("Erro ao listar clientes");
    return res.json();
  },

  async dispararTesteEvento(
    evento: string,
    contratanteIds: number[],
    options?: { tituloCobrancaId?: string | null },
  ): Promise<SmsEventoTesteResult> {
    const body: { contratanteIds: number[]; tituloCobrancaId?: string } = { contratanteIds };
    if (options?.tituloCobrancaId) {
      body.tituloCobrancaId = options.tituloCobrancaId;
    }
    const res = await apiFetch(getSmsTesteEventoUrl(evento), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = "Erro ao disparar evento";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json();
  },

  async listFila(page = 0, size = 25, status?: string): Promise<SpringPage<SmsFilaItem>> {
    const res = await apiFetch(getSmsFilaUrl(page, size, status));
    if (!res.ok) throw new Error("Erro ao listar fila");
    const data = (await res.json()) as SpringPage<SmsFilaItemRaw>;
    return {
      ...data,
      content: data.content.map(normalizeSmsFilaItem),
    };
  },

  async reprocessarFila(filaId: number): Promise<SmsFilaItem> {
    const res = await apiFetch(getSmsFilaReprocessarUrl(filaId), { method: "POST" });
    if (!res.ok) {
      let msg = "Erro ao reprocessar";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return normalizeSmsFilaItem((await res.json()) as SmsFilaItemRaw);
  },

  async cancelarFila(filaId: number): Promise<SmsFilaItem> {
    const res = await apiFetch(getSmsFilaCancelarUrl(filaId), { method: "POST" });
    if (!res.ok) {
      let msg = "Erro ao cancelar";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return normalizeSmsFilaItem((await res.json()) as SmsFilaItemRaw);
  },
};
