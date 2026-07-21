import { apiFetch } from "./api-fetch";
import {
  getAtendimentoSmsConversasUrl,
  getAtendimentoSmsConversaMensagensUrl,
  getAtendimentoSmsConversaUrl,
  getAtendimentoSmsConversasIniciarUrl,
  getAtendimentoSmsMigrarHistoricoUrl,
} from "./api-config";

export type SmsConversa = {
  id: string;
  tenantId: number;
  telefone: string;
  status: string;
  usuarioAtribuidoId?: number | null;
  dataUltimaMensagem?: string | null;
  dataUltimaInbound?: string | null;
  naoLidas?: number;
  contratanteId?: number | null;
  clienteNome?: string | null;
  tituloExibicao?: string | null;
  ultimaMensagemPreview?: string | null;
  canal?: "SMS" | string;
};

export type SmsMensagem = {
  id: string;
  conversaId: string;
  direcao: "IN" | "OUT" | string;
  autor: string;
  corpo?: string | null;
  providerMessageId?: string | null;
  status?: string | null;
  usuarioAgenteId?: number | null;
  dataCadastro?: string | null;
  erro?: string | null;
};

export type SmsMensagensPage = {
  itens: SmsMensagem[];
  hasMore: boolean;
  nextBefore?: string | null;
  nextBeforeId?: string | null;
};

export type SmsIniciarConversaResult = {
  conversa: SmsConversa;
  mensagem?: SmsMensagem | null;
};

export type SmsMigrarHistoricoResult = {
  conversasCriadasOuReusadas?: number;
  mensagensImportadas?: number;
  mensagensIgnoradas?: number;
  detalhe?: string;
  [key: string]: unknown;
};

const PAGE_SIZE = 40;

/** Chat: nunca dispara o GlobalSpinner da app. */
const quiet = { skipLoading: true as const };

export const smsAtendimentoChatService = {
  async listarConversas(status?: string): Promise<SmsConversa[]> {
    const res = await apiFetch(getAtendimentoSmsConversasUrl(status), quiet);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listarMensagensRecentes(conversaId: string): Promise<SmsMensagensPage> {
    const res = await apiFetch(
      getAtendimentoSmsConversaMensagensUrl(conversaId, { limit: PAGE_SIZE }),
      quiet,
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listarMensagensAntigas(
    conversaId: string,
    before: string,
    beforeId: string,
  ): Promise<SmsMensagensPage> {
    const res = await apiFetch(
      getAtendimentoSmsConversaMensagensUrl(conversaId, {
        before,
        beforeId,
        limit: PAGE_SIZE,
      }),
      quiet,
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async responder(conversaId: string, mensagem: string): Promise<SmsMensagem> {
    const res = await apiFetch(getAtendimentoSmsConversaMensagensUrl(conversaId), {
      ...quiet,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async iniciarConversa(body: {
    telefone: string;
    mensagem?: string | null;
    contratanteId?: number | null;
  }): Promise<SmsIniciarConversaResult> {
    const res = await apiFetch(getAtendimentoSmsConversasIniciarUrl(), {
      ...quiet,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: body.telefone.trim(),
        mensagem: body.mensagem?.trim() || undefined,
        contratanteId: body.contratanteId ?? undefined,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async atualizar(
    conversaId: string,
    body: { status?: string; atribuirAMim?: boolean; marcarLida?: boolean },
  ): Promise<SmsConversa> {
    const payload: Record<string, unknown> = {};
    if (body.status) payload.status = body.status;
    if (body.atribuirAMim) payload.atribuirAMim = true;
    if (body.marcarLida) payload.marcarLida = true;
    const res = await apiFetch(getAtendimentoSmsConversaUrl(conversaId), {
      ...quiet,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async marcarLida(conversaId: string): Promise<SmsConversa> {
    return this.atualizar(conversaId, { marcarLida: true });
  },

  async migrarHistorico(desde?: string): Promise<SmsMigrarHistoricoResult> {
    const res = await apiFetch(getAtendimentoSmsMigrarHistoricoUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(desde ? { desde } : {}),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
