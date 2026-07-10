import { apiFetch } from "./api-fetch";
import {
  getWhatsAppStatusUrl,
  getWhatsAppConnectUrl,
  getWhatsAppQrUrl,
  getWhatsAppLogoutUrl,
  getWhatsAppRecreateUrl,
  getWhatsAppTemplatesUrl,
  getWhatsAppGatilhosUrl,
  getWhatsAppEnvioTesteUrl,
  getWhatsAppEventosCatalogoUrl,
  getWhatsAppEventoPlaceholdersUrl,
  getWhatsAppLinhasUrl,
  getWhatsAppLinhasComStatusUrl,
  getWhatsAppLinhaUrl,
  getWhatsAppLinhaAtivoUrl,
  getWhatsAppTesteEventoUrl,
  getWhatsAppFilaUrl,
  getWhatsAppFilaReprocessarUrl,
  getWhatsAppFilaCancelarUrl,
  getWhatsAppBoletoEnvioHabilitadoUrl,
  getContratantesListUrl,
} from "./api-config";
import type { SpringPage } from "./spring-page";

export interface WhatsAppTemplate {
  id?: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  /** Código em tbl_evt_sys (ex.: CONTRATO_CRIADO); define placeholders sugeridos. */
  codigoEventoCatalogo?: string | null;
  anexoUrl?: string;
  tipoAnexo?: string;
  dataCadastro?: string;
}

export interface WhatsAppGatilho {
  id?: string;
  evento: string;
  template?: WhatsAppTemplate;
  /** null/undefined = linha padrão ao enfileirar */
  linha?: WhatsAppLinha | null;
  ativo: string;
  dataAlteracao?: string;
}

export interface EventoSistemaCatalogo {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  ativo: boolean;
}

/** Alinhado a {@code EventoPlaceholderResponse} na API Aires. */
export interface EventoPlaceholderCatalogo {
  id: string;
  nomeChave: string;
  token: string;
  descricao: string;
  exemplo: string;
  ordem: number;
}

export interface WhatsAppLinha {
  id: string;
  accountId: string;
  nome: string;
  padrao: boolean;
  ativo: boolean;
}

export interface WhatsAppLinhaComStatus extends WhatsAppLinha {
  connectionState: string;
  provider: string;
  relayStatus: string | null;
  lastRelayError: string | null;
}

export interface WhatsAppEventoTesteItem {
  contratanteId: number;
  contratanteNome: string;
  enfileirado: boolean;
  filaId: number | null;
  mensagem: string;
}

export interface WhatsAppEventoTesteResult {
  evento: string;
  eventoDescricao: string;
  enfileirados: number;
  ignorados: number;
  itens: WhatsAppEventoTesteItem[];
}

export interface WhatsAppFilaItem {
  id: number;
  telefone: string;
  mensagem: string;
  status: string;
  tentativas: number;
  dataAgendada: string;
  dataEnvio: string | null;
  dataCriacao: string;
  erro: string | null;
  linhaNome: string | null;
  linhaAccountId: string | null;
}

export interface ContratanteListItem {
  id: number;
  nome: string;
  cpf: string;
  cidade: string | null;
  email: string | null;
  telefoneCelular1: string | null;
}

/** Título cujo PDF é anexado no teste de COBRANCA_PARCELA. */
export const WHATSAPP_TITULO_COBRANCA_TESTE_ID = "7089f832-12cc-4648-b5ba-94ecc8033f55";

export const whatsappService = {
  async listLinhas(): Promise<WhatsAppLinha[]> {
    const res = await apiFetch(getWhatsAppLinhasUrl());
    if (!res.ok) throw new Error("Erro ao listar linhas WhatsApp");
    return res.json();
  },

  async listLinhasComStatus(options?: { skipLoading?: boolean }): Promise<WhatsAppLinhaComStatus[]> {
    const res = await apiFetch(getWhatsAppLinhasComStatusUrl(), {
      skipLoading: options?.skipLoading ?? false,
    });
    if (!res.ok) throw new Error("Erro ao listar linhas com estado");
    return res.json();
  },

  async createLinha(payload: { accountId: string; nome: string; padrao?: boolean }): Promise<WhatsAppLinha> {
    const res = await apiFetch(getWhatsAppLinhasUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao criar linha WhatsApp");
    return res.json();
  },

  async updateLinha(
    id: string,
    payload: { nome?: string; padrao?: boolean },
  ): Promise<WhatsAppLinha> {
    const res = await apiFetch(getWhatsAppLinhaUrl(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao atualizar linha WhatsApp");
    return res.json();
  },

  async setLinhaAtivo(id: string, ativo: boolean): Promise<void> {
    const res = await apiFetch(getWhatsAppLinhaAtivoUrl(id, ativo), { method: "PATCH" });
    if (!res.ok) throw new Error("Erro ao alterar estado da linha");
  },

  async deleteLinha(id: string): Promise<void> {
    const res = await apiFetch(getWhatsAppLinhaUrl(id), { method: "DELETE" });
    if (!res.ok) {
      let msg = "Erro ao remover linha WhatsApp";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },

  async getStatus(accountId?: string | null, options?: { skipLoading?: boolean }) {
    const res = await apiFetch(getWhatsAppStatusUrl(accountId), {
      skipLoading: options?.skipLoading ?? false,
    });
    if (!res.ok) throw new Error("Erro ao buscar status do WhatsApp");
    return res.json();
  },

  async connect(accountId?: string | null, options?: { force?: boolean }) {
    const res = await apiFetch(getWhatsAppConnectUrl(accountId, { force: options?.force }));
    if (!res.ok) throw new Error("Erro ao iniciar conexão do WhatsApp");
    return res.json();
  },

  async fetchQr(
    accountId?: string | null,
    options?: { skipLoading?: boolean },
  ): Promise<{ code?: string; base64?: string } | null> {
    const res = await apiFetch(getWhatsAppQrUrl(accountId), {
      skipLoading: options?.skipLoading ?? true,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao obter QR do WhatsApp");
    return res.json();
  },

  async logout(accountId?: string | null) {
    const res = await apiFetch(getWhatsAppLogoutUrl(accountId), { method: "POST" });
    if (!res.ok) throw new Error("Erro ao desconectar WhatsApp");
    return res.status === 204 || res.status === 200;
  },

  async recreate(accountId?: string | null) {
    const res = await apiFetch(getWhatsAppRecreateUrl(accountId), { method: "POST" });
    if (!res.ok) throw new Error("Erro ao recriar conexão do WhatsApp");
    return res.status === 204 || res.status === 200;
  },

  // Templates
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    const res = await apiFetch(getWhatsAppTemplatesUrl());
    if (!res.ok) throw new Error("Erro ao listar modelos do WhatsApp");
    return res.json();
  },

  async saveTemplate(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
    const res = await apiFetch(getWhatsAppTemplatesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template)
    });
    if (!res.ok) throw new Error("Erro ao salvar modelo do WhatsApp");
    return res.json();
  },

  async deleteTemplate(id: string) {
    const res = await apiFetch(`${getWhatsAppTemplatesUrl()}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir modelo do WhatsApp");
    return true;
  },

  // Gatilhos
  async listGatilhos(): Promise<WhatsAppGatilho[]> {
    const res = await apiFetch(getWhatsAppGatilhosUrl());
    if (!res.ok) throw new Error("Erro ao listar gatilhos do WhatsApp");
    return res.json();
  },

  async listEventosCatalogo(): Promise<EventoSistemaCatalogo[]> {
    const res = await apiFetch(getWhatsAppEventosCatalogoUrl());
    if (!res.ok) throw new Error("Erro ao listar catálogo de eventos");
    return res.json();
  },

  async listPlaceholdersPorEvento(codigo: string): Promise<EventoPlaceholderCatalogo[]> {
    const res = await apiFetch(getWhatsAppEventoPlaceholdersUrl(codigo));
    if (!res.ok) throw new Error("Erro ao listar placeholders do evento");
    return res.json();
  },

  async saveGatilho(gatilho: WhatsAppGatilho): Promise<WhatsAppGatilho> {
    const body = {
      id: gatilho.id ?? null,
      evento: gatilho.evento,
      templateId: gatilho.template?.id ?? null,
      linhaId: gatilho.linha?.id ?? null,
      ativo: gatilho.ativo,
    };
    const res = await apiFetch(getWhatsAppGatilhosUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Erro ao salvar gatilho do WhatsApp");
    return res.json();
  },

  async sendTestMessage(payload: {
    telefone: string;
    mensagem: string;
    accountId?: string | null;
  }): Promise<{ ok?: string; message?: string }> {
    const res = await apiFetch(getWhatsAppEnvioTesteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Erro ao enviar mensagem";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message && typeof j.message === "string") msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json() as Promise<{ ok?: string; message?: string }>;
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
  ): Promise<WhatsAppEventoTesteResult> {
    const body: { contratanteIds: number[]; tituloCobrancaId?: string } = {
      contratanteIds,
    };
    if (evento === "COBRANCA_PARCELA") {
      body.tituloCobrancaId = options?.tituloCobrancaId ?? WHATSAPP_TITULO_COBRANCA_TESTE_ID;
    }
    const res = await apiFetch(getWhatsAppTesteEventoUrl(evento), {
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

  async listFila(page = 0, size = 25, status?: string): Promise<SpringPage<WhatsAppFilaItem>> {
    const res = await apiFetch(getWhatsAppFilaUrl(page, size, status));
    if (!res.ok) {
      let msg = "Erro ao listar fila WhatsApp";
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

  async reprocessarFila(filaId: number): Promise<WhatsAppFilaItem> {
    const res = await apiFetch(getWhatsAppFilaReprocessarUrl(filaId), { method: "POST" });
    if (!res.ok) {
      let msg = "Erro ao reprocessar mensagem";
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

  async cancelarFila(filaId: number): Promise<WhatsAppFilaItem> {
    const res = await apiFetch(getWhatsAppFilaCancelarUrl(filaId), { method: "POST" });
    if (!res.ok) {
      let msg = "Erro ao cancelar mensagem";
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

  async boletoEnvioHabilitado(): Promise<boolean> {
    const url = getWhatsAppBoletoEnvioHabilitadoUrl();
    if (!url) return false;
    const res = await apiFetch(url, { skipLoading: true });
    if (!res.ok) return false;
    const data = (await res.json()) as { habilitado?: boolean };
    return Boolean(data.habilitado);
  },
};
