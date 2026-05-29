import { apiFetch } from "./api-fetch";
import {
  getContratantesListUrl,
  getEmailEnvioTesteUrl,
  getEmailEventoPlaceholdersUrl,
  getEmailEventosCatalogoUrl,
  getEmailFilaCancelarUrl,
  getEmailFilaReprocessarUrl,
  getEmailFilaUrl,
  getEmailGatilhosUrl,
  getEmailSmtpTesteUrl,
  getEmailSmtpUrl,
  getEmailTemplatesUrl,
  getEmailTesteEventoUrl,
} from "./api-config";
import type { SpringPage } from "./spring-page";

export interface EmailTemplate {
  id?: string;
  nome: string;
  descricao?: string;
  assunto: string;
  conteudo: string;
  codigoEventoCatalogo?: string | null;
  dataCadastro?: string;
}

export interface EmailTemplateRef {
  id: string;
  nome: string;
  assunto: string;
}

export interface EmailGatilho {
  id?: string;
  evento: string;
  template?: EmailTemplateRef | null;
  ativo: string;
  dataAlteracao?: string;
}

export interface EmailSmtpConfig {
  id?: string;
  nomeRemetente: string;
  emailRemetente: string;
  usuarioSmtp: string;
  hostSmtp: string;
  portaSmtp: number;
  tipoCriptografia: string;
  provedor?: string;
  replyTo?: string | null;
  ativo: boolean;
  ultimoTesteEm?: string | null;
  ultimoTesteOk?: boolean | null;
  senhaConfigurada?: boolean;
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

export interface EmailFilaItem {
  id: number;
  destinatario: string;
  assunto: string;
  corpo: string;
  status: string;
  tentativas: number;
  dataAgendada: string;
  dataEnvio?: string | null;
  dataCriacao: string;
  erro?: string | null;
}

export interface ContratanteListItem {
  id: number;
  nome: string;
  cpf?: string | null;
  cidade?: string | null;
  email?: string | null;
  telefoneCelular1?: string | null;
}

export interface EmailEventoTesteItem {
  contratanteId: number;
  contratanteNome: string;
  enfileirado: boolean;
  filaId?: number | null;
  mensagem?: string | null;
}

export interface EmailEventoTesteResult {
  evento: string;
  eventoDescricao: string;
  enfileirados: number;
  ignorados: number;
  itens: EmailEventoTesteItem[];
}

export const EMAIL_TITULO_COBRANCA_TESTE_ID = "7089f832-12cc-4648-b5ba-94ecc8033f55";

export const TITAN_SMTP_PRESET = {
  hostSmtp: "smtp.titan.email",
  portaSmtp: 465,
  tipoCriptografia: "SSL",
  provedor: "TITAN",
};

export const emailService = {
  async getSmtpConfig(): Promise<EmailSmtpConfig | null> {
    const res = await apiFetch(getEmailSmtpUrl());
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Erro ao carregar configuração SMTP");
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as EmailSmtpConfig;
  },

  async saveSmtpConfig(payload: {
    nomeRemetente: string;
    emailRemetente: string;
    usuarioSmtp: string;
    senhaSmtp?: string;
    hostSmtp: string;
    portaSmtp: number;
    tipoCriptografia: string;
    provedor?: string;
    replyTo?: string | null;
    ativo: string;
  }): Promise<EmailSmtpConfig> {
    const res = await apiFetch(getEmailSmtpUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Erro ao salvar SMTP";
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

  async testeSmtp(destino: string): Promise<void> {
    const res = await apiFetch(getEmailSmtpTesteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destino }),
    });
    if (!res.ok) {
      let msg = "Erro no teste SMTP";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },

  async sendTestMessage(payload: { destino: string; assunto: string; corpo: string }): Promise<void> {
    const res = await apiFetch(getEmailEnvioTesteUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Erro ao enviar e-mail";
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },

  async listTemplates(): Promise<EmailTemplate[]> {
    const res = await apiFetch(getEmailTemplatesUrl());
    if (!res.ok) throw new Error("Erro ao listar modelos");
    return res.json();
  },

  async saveTemplate(template: EmailTemplate): Promise<EmailTemplate> {
    const res = await apiFetch(getEmailTemplatesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error("Erro ao salvar modelo");
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await apiFetch(`${getEmailTemplatesUrl()}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao excluir modelo");
  },

  async listEventosCatalogo(): Promise<EventoSistemaCatalogo[]> {
    const res = await apiFetch(getEmailEventosCatalogoUrl());
    if (!res.ok) throw new Error("Erro ao listar eventos");
    return res.json();
  },

  async listPlaceholdersPorEvento(codigo: string): Promise<EventoPlaceholderCatalogo[]> {
    const res = await apiFetch(getEmailEventoPlaceholdersUrl(codigo));
    if (!res.ok) throw new Error("Erro ao listar placeholders");
    return res.json();
  },

  async listGatilhos(): Promise<EmailGatilho[]> {
    const res = await apiFetch(getEmailGatilhosUrl());
    if (!res.ok) throw new Error("Erro ao listar gatilhos");
    return res.json();
  },

  async saveGatilho(gatilho: EmailGatilho): Promise<EmailGatilho> {
    const body = {
      id: gatilho.id ?? null,
      evento: gatilho.evento,
      templateId: gatilho.template?.id ?? null,
      ativo: gatilho.ativo,
    };
    const res = await apiFetch(getEmailGatilhosUrl(), {
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
  ): Promise<EmailEventoTesteResult> {
    const body: { contratanteIds: number[]; tituloCobrancaId?: string } = { contratanteIds };
    if (evento === "COBRANCA_PARCELA") {
      body.tituloCobrancaId = options?.tituloCobrancaId ?? EMAIL_TITULO_COBRANCA_TESTE_ID;
    }
    const res = await apiFetch(getEmailTesteEventoUrl(evento), {
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

  async listFila(page = 0, size = 25, status?: string): Promise<SpringPage<EmailFilaItem>> {
    const res = await apiFetch(getEmailFilaUrl(page, size, status));
    if (!res.ok) throw new Error("Erro ao listar fila");
    return res.json();
  },

  async reprocessarFila(filaId: number): Promise<EmailFilaItem> {
    const res = await apiFetch(getEmailFilaReprocessarUrl(filaId), { method: "POST" });
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
    return res.json();
  },

  async cancelarFila(filaId: number): Promise<EmailFilaItem> {
    const res = await apiFetch(getEmailFilaCancelarUrl(filaId), { method: "POST" });
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
    return res.json();
  },
};
