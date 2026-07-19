import { apiFetch } from "./api-fetch";
import {
  getAtendimentoConversasUrl,
  getAtendimentoConversaMensagensUrl,
  getAtendimentoConversaAnexoUrl,
  getAtendimentoConversaUrl,
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
};

export type WhatsAppMensagensPage = {
  itens: WhatsAppMensagemChat[];
  hasMore: boolean;
  nextBefore?: string | null;
  nextBeforeId?: string | null;
};

const PAGE_SIZE = 40;

export const atendimentoChatService = {
  async listarConversas(status?: string): Promise<WhatsAppConversa[]> {
    const res = await apiFetch(getAtendimentoConversasUrl(status));
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /** Últimas mensagens (página inicial). */
  async listarMensagensRecentes(conversaId: string): Promise<WhatsAppMensagensPage> {
    const res = await apiFetch(
      getAtendimentoConversaMensagensUrl(conversaId, { limit: PAGE_SIZE }),
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /** Mensagens mais antigas que o cursor. */
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
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responder(conversaId: string, mensagem: string): Promise<WhatsAppMensagemChat> {
    const res = await apiFetch(getAtendimentoConversaMensagensUrl(conversaId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responderAnexo(
    conversaId: string,
    file: File,
    mensagem?: string,
  ): Promise<WhatsAppMensagemChat> {
    const form = new FormData();
    form.append("file", file);
    if (mensagem?.trim()) {
      form.append("mensagem", mensagem.trim());
    }
    const res = await apiFetch(getAtendimentoConversaAnexoUrl(conversaId), {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async atualizar(
    conversaId: string,
    body: { status?: string; atribuirAMim?: boolean },
  ): Promise<WhatsAppConversa> {
    const res = await apiFetch(getAtendimentoConversaUrl(conversaId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
