import { apiFetch } from "./api-fetch";
import {
  getAtendimentoConversasUrl,
  getAtendimentoConversaMensagensUrl,
  getAtendimentoConversaAnexoUrl,
  getAtendimentoConversaTemplateUrl,
  getAtendimentoTemplatesAprovadosUrl,
  getAtendimentoConversaUrl,
  getAtendimentoConversasIniciarUrl,
} from "./api-config";

export type WhatsAppJanelaEstado =
  | "ABERTA"
  | "FECHANDO"
  | "FECHADA"
  | "SEM_INBOUND";

export type WhatsAppConversa = {
  id: string;
  tenantId: number;
  telefone: string;
  status: string;
  usuarioAtribuidoId?: number | null;
  dataUltimaMensagem?: string | null;
  dataUltimaInbound?: string | null;
  naoLidas?: number;
  clienteId?: string | null;
  contratanteId?: number | null;
  clienteNome?: string | null;
  empreendimento?: string | null;
  quadra?: string | null;
  lote?: number | null;
  tituloExibicao?: string | null;
  janelaEstado?: WhatsAppJanelaEstado | string | null;
  janelaExpiraEm?: string | null;
  janelaRestanteSegundos?: number | null;
  ultimaMensagemPreview?: string | null;
};

export type WhatsAppMensagemReplyTo = {
  id: string;
  corpo?: string | null;
  autor?: string | null;
  direcao?: string | null;
  mediaKind?: string | null;
};

export type WhatsAppMensagemChat = {
  id: string;
  conversaId: string;
  direcao: "IN" | "OUT" | string;
  autor: string;
  corpo?: string | null;
  providerMessageId?: string | null;
  status?: string | null;
  usuarioAgenteId?: number | null;
  dataCadastro?: string | null;
  mediaToken?: string | null;
  mediaNomeArquivo?: string | null;
  mediaContentType?: string | null;
  mediaKind?: "IMAGE" | "DOCUMENT" | "AUDIO" | string | null;
  mediaUrl?: string | null;
  replyTo?: WhatsAppMensagemReplyTo | null;
};

export type WhatsAppTemplateAprovado = {
  templateId: string;
  nome: string;
  descricao?: string | null;
  conteudo?: string | null;
  contentSid: string;
  mapaVariaveisJson?: string | null;
};

export type WhatsAppMensagensPage = {
  itens: WhatsAppMensagemChat[];
  hasMore: boolean;
  nextBefore?: string | null;
  nextBeforeId?: string | null;
};

export type WhatsAppIniciarConversaResult = {
  conversa: WhatsAppConversa;
  mensagem: WhatsAppMensagemChat;
};

const PAGE_SIZE = 40;

/** Chat: nunca dispara o GlobalSpinner da app. */
const quiet = { skipLoading: true as const };

export const atendimentoChatService = {
  async listarConversas(status?: string): Promise<WhatsAppConversa[]> {
    const res = await apiFetch(getAtendimentoConversasUrl(status), quiet);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listarTemplatesAprovados(): Promise<WhatsAppTemplateAprovado[]> {
    const res = await apiFetch(getAtendimentoTemplatesAprovadosUrl(), quiet);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listarMensagensRecentes(conversaId: string): Promise<WhatsAppMensagensPage> {
    const res = await apiFetch(
      getAtendimentoConversaMensagensUrl(conversaId, { limit: PAGE_SIZE }),
      quiet,
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listarMensagensAntigas(
    conversaId: string,
    before: string,
    beforeId: string,
  ): Promise<WhatsAppMensagensPage> {
    const res = await apiFetch(
      getAtendimentoConversaMensagensUrl(conversaId, {
        before,
        beforeId,
        limit: PAGE_SIZE,
      }),
      quiet,
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responder(
    conversaId: string,
    mensagem: string,
    replyToMensagemId?: string | null,
  ): Promise<WhatsAppMensagemChat> {
    const res = await apiFetch(getAtendimentoConversaMensagensUrl(conversaId), {
      ...quiet,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensagem,
        replyToMensagemId: replyToMensagemId || undefined,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responderAnexo(
    conversaId: string,
    file: File,
    mensagem?: string,
    replyToMensagemId?: string | null,
  ): Promise<WhatsAppMensagemChat> {
    const form = new FormData();
    form.append("file", file);
    if (mensagem?.trim()) {
      form.append("mensagem", mensagem.trim());
    }
    if (replyToMensagemId) {
      form.append("replyToMensagemId", replyToMensagemId);
    }
    const res = await apiFetch(getAtendimentoConversaAnexoUrl(conversaId), {
      ...quiet,
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responderTemplate(
    conversaId: string,
    templateId: string,
    variaveis?: Record<string, string>,
  ): Promise<WhatsAppMensagemChat> {
    const res = await apiFetch(getAtendimentoConversaTemplateUrl(conversaId), {
      ...quiet,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        variaveis: variaveis && Object.keys(variaveis).length > 0 ? variaveis : undefined,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async iniciarConversa(body: {
    contratanteId?: number | null;
    telefone?: string | null;
    templateId: string;
    variaveis?: Record<string, string>;
  }): Promise<WhatsAppIniciarConversaResult> {
    const res = await apiFetch(getAtendimentoConversasIniciarUrl(), {
      ...quiet,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contratanteId: body.contratanteId ?? undefined,
        telefone: body.telefone?.trim() || undefined,
        templateId: body.templateId,
        variaveis:
          body.variaveis && Object.keys(body.variaveis).length > 0
            ? body.variaveis
            : undefined,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async atualizar(
    conversaId: string,
    body: { status?: string; atribuirAMim?: boolean; marcarLida?: boolean },
  ): Promise<WhatsAppConversa> {
    const payload: Record<string, string> = {};
    if (body.status) payload.status = body.status;
    if (body.atribuirAMim) payload.atribuirAMim = "true";
    if (body.marcarLida) payload.marcarLida = "true";
    const res = await apiFetch(getAtendimentoConversaUrl(conversaId), {
      ...quiet,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async marcarLida(conversaId: string): Promise<WhatsAppConversa> {
    return this.atualizar(conversaId, { marcarLida: true });
  },
};
