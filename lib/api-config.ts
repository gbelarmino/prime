import { readPrimeEnv } from "@/lib/runtime-env";

/**
 * URLs da API Spring Boot.
 * Só `NEXT_PUBLIC_API_BASE_URL` vem do ambiente; caminhos REST são fixos (iguais em local e produção).
 *
 * Site em HTTPS (ex.: Firebase) exige API em HTTPS — caso contrário o browser bloqueia (Mixed Content).
 */
const API_PATHS = {
  login: "/api/auth/login",
  leads: "/api/leads",
  contratantes: "/api/contratantes",
  imobiliarias: "/api/imobiliarias",
  corretores: "/api/corretores",
  imoveis: "/api/imoveis",
  contratosHonorarios: "/api/contratos-honorarios",
  dominios: "/api/dominios",
  usuarios: "/api/usuarios",
   dashboard: "/api/dashboard",
  notificacoes: "/api/notificacoes",
  parametros: "/api/parametros",
  whatsapp: "/api/whatsapp",
  email: "/api/email",
  finTitulos: "/api/fin/titulos",
  finLancamentos: "/api/fin/lancamentos",
  finPorImovel: "/api/fin/por-imovel",
  finConvenios: "/api/fin/convenios",
  finDashboard: "/api/fin/dashboard",
  finFluxoReceita: "/api/fin/fluxo-receita",
  finPlanoContas: "/api/fin/plano-contas",
  finConciliacao: "/api/fin/conciliacao",
  finUnicredWebhookConciliacao: "/api/fin/unicred-webhooks/conciliacao",
  finIndicesIpca: "/api/fin/indices/ipca",
  finIndicesIgpm: "/api/fin/indices/igpm",
  finReajusteSimular: "/api/fin/reajuste/simular",
  finCobrancaRegua: "/api/fin/cobranca-regua",
  finCobrancaGrupos: "/api/fin/cobranca-grupos",
  atendimento: "/api/atendimento",
  auditoria: "/api/auditoria",
  tenantsMe: "/api/tenants/me",
  authSwitchTenant: "/api/auth/switch-tenant",
  crmLeads: "/api/crm/leads",
  crmLeadsKanban: "/api/crm/leads/kanban",
  crmFunilEtapas: "/api/crm/funil/etapas",
  crmFunilEventos: "/api/crm/funil/eventos",
  crmFunilAcoesTipos: "/api/crm/funil/acoes-tipos",
  crmFunilCardAcoes: "/api/crm/funil/card-acoes",
  crmFunilGatilhos: "/api/crm/funil/gatilhos",
  crmCampanhas: "/api/crm/campanhas",
  crmCaptacaoPublica: "/api/public/crm/captacao",
  tenantsMeFeatures: "/api/tenants/me/features",
} as const;

function normalizeApiBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/$/, "");
  base = base.replace(/^(https?:\/\/[^/]+)\/:(\d+)$/, "$1:$2");
  return base;
}

function withBase(base: string, path: string): string {
  if (!base) return "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getApiBaseUrl(): string {
  const raw = readPrimeEnv("NEXT_PUBLIC_API_BASE_URL");
  return raw ? normalizeApiBaseUrl(raw) : "";
}

export function getLoginUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.login);
}

export function getLeadUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.leads);
}

/** Base REST de contratantes (GET lista/detalhe, POST criação). */
export function getContratanteUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.contratantes);
}

/** GET paginado — resposta no formato `Page` do Spring (`content`, `totalElements`, …). */
export function getContratantesListUrl(page = 0, size = 50, q?: string): string {
  const base = getContratanteUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "nome,asc",
  });
  const term = q?.trim();
  if (term) params.set("q", term);
  return `${base}?${params.toString()}`;
}

/** vCard para importação na agenda do telemóvel (respeita o mesmo filtro `q` da listagem). */
export function getContratantesExportAgendaUrl(q?: string): string {
  const base = getContratanteUrl();
  if (!base) return "";
  const params = new URLSearchParams();
  const term = q?.trim();
  if (term) params.set("q", term);
  const qs = params.toString();
  return qs ? `${base}/export-agenda?${qs}` : `${base}/export-agenda`;
}

export function getContratanteByIdUrl(id: number): string {
  const base = getContratanteUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

// ---------------------------------------------------------------------------
// Imobiliárias
// ---------------------------------------------------------------------------

export function getImobiliariaUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.imobiliarias);
}

export function getImobiliariasListUrl(page = 0, size = 100, q?: string): string {
  const base = getImobiliariaUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "razaoSocial,asc",
  });
  const term = q?.trim();
  if (term) params.set("q", term);
  return `${base}?${params.toString()}`;
}

export function getImobiliariaByIdUrl(id: number): string {
  const base = getImobiliariaUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

/** Imobiliária do usuário autenticado (perfil IMOBILIARIA). */
export function getImobiliariaMeUrl(): string {
  const base = getImobiliariaUrl();
  if (!base) return "";
  return `${base}/me`;
}

// ---------------------------------------------------------------------------
// Corretores
// ---------------------------------------------------------------------------

export function getCorretorUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.corretores);
}

export function getCorretoresListUrl(page = 0, size = 100, q?: string): string {
  const base = getCorretorUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "nome,asc",
  });
  const term = q?.trim();
  if (term) params.set("q", term);
  return `${base}?${params.toString()}`;
}

export function getCorretorByIdUrl(id: number): string {
  const base = getCorretorUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

// ---------------------------------------------------------------------------
// Imóveis
// ---------------------------------------------------------------------------

export function getImovelUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.imoveis);
}

export function getImoveisQuadrasUrl(
  situacao?: number | null,
  empreendimento?: string | null,
): string {
  const base = getImovelUrl();
  if (!base) return "";
  const url = new URL(`${base}/quadras`, "http://localhost"); // base URL doesn't matter for query params
  if (situacao != null) url.searchParams.set("situacao", String(situacao));
  const emp = empreendimento?.trim();
  if (emp) url.searchParams.set("empreendimento", emp);
  return `${base}/quadras${url.search}`;
}

export function getImoveisEmpreendimentosUrl(): string {
  const base = getImovelUrl();
  if (!base) return "";
  return `${base}/empreendimentos`;
}

export function getImoveisListUrl(
  page = 0,
  size = 100,
  q?: string,
  quadra?: string,
  situacao?: number | null,
  empreendimento?: string,
): string {
  const base = getImovelUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  params.append("sort", "quadra,asc");
  params.append("sort", "lote,asc");

  const term = q?.trim();
  if (term) params.set("q", term);
  const qd = quadra?.trim();
  if (qd) params.set("quadra", qd);
  const emp = empreendimento?.trim();
  if (emp) params.set("empreendimento", emp);
  if (situacao != null) params.set("situacao", String(situacao));
  return `${base}?${params.toString()}`;
}

export function getImovelByIdUrl(id: number): string {
  const base = getImovelUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getImovelPrecoUrl(id: number): string {
  const base = getImovelUrl();
  if (!base) return "";
  return `${base}/${id}/preco`;
}

export function getImovelPrecoByLotUrl(quadra: string, lote: number): string {
  const base = getImovelUrl();
  if (!base) return "";
  return `${base}/preco?quadra=${encodeURIComponent(quadra)}&lote=${String(lote)}`;
}

// ---------------------------------------------------------------------------
// Contratos de honorários
// ---------------------------------------------------------------------------

export function getContratoHonorariosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.contratosHonorarios);
}

/** GET — pré-visualização do número automático (seq/quadra+lote) no formulário de criação. */
export function getContratoProximoNumeroUrl(imovelId: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  const params = new URLSearchParams({ imovelId: String(imovelId) });
  return `${base}/proximo-numero?${params.toString()}`;
}

/** POST multipart — registo de contrato legado/atípico (admin): partes `dados` (JSON) + `file` (PDF). */
export function getContratoRegistrarLegadoUrl(): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/registrar-legado`;
}

/** GET — itens de domínio para selects (ex.: nomeCampo=ST_CTR para status de contrato). */
export function getDominiosSelectItemsUrl(nomeCampo: string): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.dominios);
  if (!base) return "";
  return `${base}/select-items?nomeCampo=${encodeURIComponent(nomeCampo)}`;
}

export function getContratosHonorariosListUrl(
  page = 0,
  size = 50,
  q?: string,
  status?: string,
  id?: string | null,
  empreendimento?: string,
  contratanteId?: number | null
): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  params.append("sort", "criadoEm,desc");
  params.append("sort", "id,desc");
  const term = q?.trim();
  if (term) params.set("q", term);
  if (status) params.set("status", status);
  if (id && id !== "undefined") params.set("id", id);
  const emp = empreendimento?.trim();
  if (emp) params.set("empreendimento", emp);
  if (contratanteId != null && contratanteId > 0) params.set("contratanteId", String(contratanteId));
  return `${base}?${params.toString()}`;
}

export function getContratoHonorariosByIdUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getContratoHonorariosExportExcelUrl(
  q?: string,
  status?: string,
  id?: string | null,
  empreendimento?: string,
  contratanteId?: number | null
): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  const params = new URLSearchParams();
  const term = q?.trim();
  if (term) params.set("q", term);
  if (status) params.set("status", status);
  if (id && id !== "undefined") params.set("id", id);
  const emp = empreendimento?.trim();
  if (emp) params.set("empreendimento", emp);
  if (contratanteId != null && contratanteId > 0) params.set("contratanteId", String(contratanteId));
  return `${base}/exportar-excel?${params.toString()}`;
}

export function getContratoHistoricoUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/historico`;
}

export function getContratoAprovarUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/aprovar`;
}

export function getContratoReprovarUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/reprovar`;
}

export function getContratoEnviarPropostaUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/enviar-proposta`;
}

export function getContratoCancelarUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/cancelar`;
}

export function getContratoEnviarClicksignUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/enviar-clicksign`;
}

/** GET — HTML do contrato (text/html) para visualização ou impressão. */
export function getContratoHonorariosHtmlUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/html`;
}

/** GET — PDF do contrato (application/pdf) para download. */
export function getContratoHonorariosPdfUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/pdf`;
}

/** GET — PDF assinado final (capturado via webhook). */
export function getContratoHonorariosPdfAssinadoUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/pdf-assinado`;
}

/** PUT — anexa ou substitui PDF assinado de contrato legado (multipart, campo {@code file}). */
export function getContratoHonorariosPdfAssinadoUploadUrl(id: number): string {
  const base = getContratoHonorariosUrl();
  if (!base) return "";
  return `${base}/${id}/pdf-assinado`;
}

// ---------------------------------------------------------------------------
// Documentos do contratante
// ---------------------------------------------------------------------------

/** Lista documentos de um contratante: GET /api/contratantes/{id}/documentos */
export function getDocumentosContratanteUrl(contratanteId: number): string {
  const base = getContratanteUrl();
  if (!base) return "";
  return `${base}/${contratanteId}/documentos`;
}

/** Download/visualização de documento: GET /api/contratantes/{id}/documentos/{docId} */
export function getDocumentoContratanteUrl(contratanteId: number, docId: number, download = false): string {
  const base = getContratanteUrl();
  if (!base) return "";
  return `${base}/${contratanteId}/documentos/${docId}${download ? "?download=true" : ""}`;
}

/** Verifica obrigatórios faltantes: GET /api/contratantes/{id}/documentos/obrigatorios-faltantes */
export function getDocumentosObrigatoriosFaltantesUrl(contratanteId: number): string {
  const base = getContratanteUrl();
  if (!base) return "";
  return `${base}/${contratanteId}/documentos/obrigatorios-faltantes`;
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export function getUsuarioUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.usuarios);
}

export function getUsuarioMeUrl(): string {
  return `${getUsuarioUrl()}/me`;
}

export function getUsuariosListUrl(page = 0, size = 100, q?: string, perfil?: string, situacao?: number | null): string {
  const base = getUsuarioUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "nome,asc",
  });
  const term = q?.trim();
  if (term) params.set("q", term);
  if (perfil) params.set("perfil", perfil);
  if (situacao != null) params.set("situacao", String(situacao));
  return `${base}?${params.toString()}`;
}

export function getUsuarioByIdUrl(id: number): string {
  const base = getUsuarioUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getUsuarioSituacaoUrl(id: number): string {
  const base = getUsuarioByIdUrl(id);
  if (!base) return "";
  return `${base}/situacao`;
}

export function getUsuarioTrocarSenhaUrl(): string {
  return `${getUsuarioUrl()}/senha`;
}

export function getCepUrl(cep: string): string {
  return `${getApiBaseUrl()}/api/consulta-cep/${cep}`;
}

export function getDashboardStatsUrl(): string {
  return withBase(getApiBaseUrl(), `${API_PATHS.dashboard}/stats`);
}

export function getDashboardInadimplenciaUrl(): string {
  return withBase(getApiBaseUrl(), `${API_PATHS.dashboard}/inadimplencia`);
}

export function getDashboardPorEmpreendimentoUrl(): string {
  return withBase(getApiBaseUrl(), `${API_PATHS.dashboard}/por-empreendimento`);
}

export function getDashboardAtividadesUrl(page = 0, size = 20): string {
  return withBase(getApiBaseUrl(), `${API_PATHS.dashboard}/atividades?page=${page}&size=${size}`);
}

// ---------------------------------------------------------------------------
// Clicksign
// ---------------------------------------------------------------------------

/** Status Clicksign v3: running (em curso), closed (fechado), canceled (cancelado), etc. */
export type ClicksignEnvelopeStatusFilter = "" | "draft" | "running" | "closed" | "canceled";

export function getClicksignEnvelopesUrl(
  page = 1,
  status?: ClicksignEnvelopeStatusFilter,
  size = 10,
): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (status) params.set("status", status);
  return `${base}/api/clicksign/envelopes?${params.toString()}`;
}

export function getClicksignEnvelopeDetailsUrl(id: string): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  return `${base}/api/clicksign/envelopes/${id}`;
}

export function getClicksignAutoSignatureTermUrl(): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  return `${base}/api/clicksign/auto-signature/terms`;
}

export function getClicksignResyncPdfsUrl(): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  return `${base}/api/clicksign/resincronizar-pdfs-assinados`;
}

export type ClicksignPdfResyncLogLine = {
  nivel: "INFO" | "SUCESSO" | "AVISO" | "ERRO" | string;
  mensagem: string;
  contratoId: number | null;
  numeroContrato: string | null;
};

export type ClicksignPdfResyncResponse = {
  totalContratos: number;
  baixados: number;
  ignorados: number;
  falhas: number;
  diretorioUpload: string;
  logs: ClicksignPdfResyncLogLine[];
};

export type AutoSignatureTermPayload = {
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
};

export type AutoSignatureTermResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  termoId?: string | null;
  nome?: string | null;
  email?: string | null;
  documentation?: string | null;
  birthday?: string | null;
  created?: string | null;
  errors?: string[];
  raw?: Record<string, unknown> | null;
};

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

export function getNotificacaoUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.notificacoes);
}

export function getNotificacaoStreamUrl(): string {
  const base = getNotificacaoUrl();
  if (!base) return "";
  return `${base}/stream`;
}

export function getNotificacaoMarcarLidaUrl(id: number): string {
  const base = getNotificacaoUrl();
  if (!base) return "";
  return `${base}/${id}/lida`;
}

export function getNotificacaoWsUrl(): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  // Converte http:// para ws:// ou https:// para wss://
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/ws/notificacoes`;
}

export function getParametroByNomeUrl(nome: string): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.parametros);
  if (!base) return "";
  return `${base}/${nome}`;
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

export function getWhatsAppUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.whatsapp);
}

function withOptionalAccountIdQuery(url: string, accountId?: string | null): string {
  const a = accountId?.trim();
  if (!a) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}accountId=${encodeURIComponent(a)}`;
}

export function getWhatsAppStatusUrl(accountId?: string | null): string {
  return withOptionalAccountIdQuery(`${getWhatsAppUrl()}/status`, accountId);
}

export function getWhatsAppConnectUrl(accountId?: string | null, options?: { force?: boolean }): string {
  let url = withOptionalAccountIdQuery(`${getWhatsAppUrl()}/connect`, accountId);
  if (options?.force) {
    url += `${url.includes("?") ? "&" : "?"}force=true`;
  }
  return url;
}

export function getWhatsAppQrUrl(accountId?: string | null): string {
  return withOptionalAccountIdQuery(`${getWhatsAppUrl()}/qr`, accountId);
}

export function getWhatsAppLogoutUrl(accountId?: string | null): string {
  return withOptionalAccountIdQuery(`${getWhatsAppUrl()}/logout`, accountId);
}

export function getWhatsAppRecreateUrl(accountId?: string | null): string {
  return withOptionalAccountIdQuery(`${getWhatsAppUrl()}/recreate`, accountId);
}

export function getWhatsAppLinhasUrl(): string {
  return `${getWhatsAppUrl()}/linhas`;
}

export function getWhatsAppLinhasComStatusUrl(): string {
  return `${getWhatsAppUrl()}/linhas/com-status`;
}

export function getWhatsAppLinhaUrl(id: string): string {
  return `${getWhatsAppUrl()}/linhas/${encodeURIComponent(id)}`;
}

export function getWhatsAppLinhaAtivoUrl(id: string, ativo: boolean): string {
  return `${getWhatsAppUrl()}/linhas/${encodeURIComponent(id)}/ativo?ativo=${ativo ? "true" : "false"}`;
}

export function getWhatsAppTemplatesUrl(): string {
  return `${getWhatsAppUrl()}/templates`;
}

export function getWhatsAppGatilhosUrl(): string {
  return `${getWhatsAppUrl()}/gatilhos`;
}

export function getWhatsAppEventosCatalogoUrl(): string {
  return `${getWhatsAppUrl()}/eventos-catalogo`;
}

/** Placeholders disponíveis para um código de evento do catálogo (ex.: CONTRATO_CRIADO). */
export function getWhatsAppEventoPlaceholdersUrl(codigo: string): string {
  const c = encodeURIComponent(codigo.trim());
  return `${getWhatsAppUrl()}/eventos-catalogo/${c}/placeholders`;
}

export function getWhatsAppEnvioTesteUrl(): string {
  return `${getWhatsAppUrl()}/envio-teste`;
}

export function getWhatsAppTesteEventoUrl(evento: string): string {
  return `${getWhatsAppUrl()}/teste-eventos/${encodeURIComponent(evento.trim())}`;
}

/** GET fila paginada (`Page` Spring). */
export function getWhatsAppFilaUrl(page = 0, size = 25, status?: string): string {
  const base = getWhatsAppUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "dataCriacao,desc",
  });
  const st = status?.trim();
  if (st) params.set("status", st);
  return `${base}/fila?${params.toString()}`;
}

export function getWhatsAppFilaReprocessarUrl(filaId: number): string {
  const base = getWhatsAppUrl();
  if (!base) return "";
  return `${base}/fila/${filaId}/reprocessar`;
}

export function getWhatsAppFilaCancelarUrl(filaId: number): string {
  const base = getWhatsAppUrl();
  if (!base) return "";
  return `${base}/fila/${filaId}/cancelar`;
}

// ---------------------------------------------------------------------------
// E-mail (SMTP / gatilhos)
// ---------------------------------------------------------------------------

export function getEmailUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.email);
}

export function getEmailSmtpUrl(): string {
  return `${getEmailUrl()}/smtp`;
}

export function getEmailSmtpTesteUrl(): string {
  return `${getEmailUrl()}/smtp/teste`;
}

export function getEmailEnvioTesteUrl(): string {
  return `${getEmailUrl()}/envio-teste`;
}

export function getEmailTemplatesUrl(): string {
  return `${getEmailUrl()}/templates`;
}

export function getEmailGatilhosUrl(): string {
  return `${getEmailUrl()}/gatilhos`;
}

export function getEmailEventosCatalogoUrl(): string {
  return `${getEmailUrl()}/eventos-catalogo`;
}

export function getEmailEventoPlaceholdersUrl(codigo: string): string {
  const c = encodeURIComponent(codigo.trim());
  return `${getEmailUrl()}/eventos-catalogo/${c}/placeholders`;
}

export function getEmailTesteEventoUrl(evento: string): string {
  return `${getEmailUrl()}/teste-eventos/${encodeURIComponent(evento.trim())}`;
}

export function getEmailFilaUrl(page = 0, size = 25, status?: string): string {
  const base = getEmailUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (status?.trim()) params.set("status", status.trim());
  return `${base}/fila?${params.toString()}`;
}

export function getEmailFilaReprocessarUrl(filaId: number): string {
  const base = getEmailUrl();
  if (!base) return "";
  return `${base}/fila/${filaId}/reprocessar`;
}

export function getEmailFilaCancelarUrl(filaId: number): string {
  const base = getEmailUrl();
  if (!base) return "";
  return `${base}/fila/${filaId}/cancelar`;
}

// ---------------------------------------------------------------------------
// Financeiro — títulos / boletos (Fase 1)
// ---------------------------------------------------------------------------

export function getFinTitulosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finTitulos);
}

export function getFinTitulosLoteUrl(): string {
  return `${getFinTitulosUrl()}/lote`;
}

export function getFinTitulosRegistrarLoteUrl(): string {
  return `${getFinTitulosUrl()}/registrar/lote`;
}

export function getFinTitulosMarcarVencidosUrl(): string {
  return `${getFinTitulosUrl()}/jobs/marcar-vencidos`;
}

export function getFinTitulosPdfLoteUrl(): string {
  return `${getFinTitulosUrl()}/pdf/lote`;
}

export function getFinTitulosWhatsAppCobrancaParcelaLoteUrl(): string {
  return `${getFinTitulosUrl()}/whatsapp/cobranca-parcela/lote`;
}

export function getFinTitulosEmailCobrancaParcelaLoteUrl(): string {
  return `${getFinTitulosUrl()}/email/cobranca-parcela/lote`;
}

export function getFinTitulosIdsElegiveisWhatsAppUrl(opts?: FinTitulosListFilters): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams();
  appendFinTitulosListFilterParams(params, opts);
  const qs = params.toString();
  return qs ? `${base}/ids-elegiveis-whatsapp?${qs}` : `${base}/ids-elegiveis-whatsapp`;
}

export function getFinTitulosIdsElegiveisRegistroUrl(opts?: FinTitulosListFilters): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams();
  appendFinTitulosListFilterParams(params, opts);
  const qs = params.toString();
  return qs ? `${base}/ids-elegiveis-registro?${qs}` : `${base}/ids-elegiveis-registro`;
}

export type FinTitulosListFilters = {
  status?: string;
  contratoId?: number;
  imovelId?: number;
  vencimentoDe?: string;
  vencimentoAte?: string;
  cadastroDe?: string;
  cadastroAte?: string;
  pagamentoDe?: string;
  pagamentoAte?: string;
  empreendimento?: string;
  quadra?: string;
  lote?: number;
  contrato?: string;
  nome?: string;
  cpf?: string;
  nossoNumero?: string;
};

function appendFinTitulosListFilterParams(
  params: URLSearchParams,
  opts?: FinTitulosListFilters,
): void {
  if (opts?.status) params.set("status", opts.status);
  if (opts?.contratoId != null) params.set("contratoId", String(opts.contratoId));
  if (opts?.imovelId != null) params.set("imovelId", String(opts.imovelId));
  if (opts?.vencimentoDe) params.set("vencimentoDe", opts.vencimentoDe);
  if (opts?.vencimentoAte) params.set("vencimentoAte", opts.vencimentoAte);
  if (opts?.cadastroDe) params.set("cadastroDe", opts.cadastroDe);
  if (opts?.cadastroAte) params.set("cadastroAte", opts.cadastroAte);
  if (opts?.pagamentoDe) params.set("pagamentoDe", opts.pagamentoDe);
  if (opts?.pagamentoAte) params.set("pagamentoAte", opts.pagamentoAte);
  if (opts?.empreendimento?.trim()) params.set("empreendimento", opts.empreendimento.trim());
  if (opts?.quadra?.trim()) params.set("quadra", opts.quadra.trim());
  if (opts?.lote != null) params.set("lote", String(opts.lote));
  if (opts?.contrato?.trim()) params.set("contrato", opts.contrato.trim());
  if (opts?.nome?.trim()) params.set("nome", opts.nome.trim());
  if (opts?.cpf?.trim()) params.set("cpf", opts.cpf.trim());
  if (opts?.nossoNumero?.trim()) params.set("nossoNumero", opts.nossoNumero.trim());
}

export function getFinTitulosListUrl(
  page = 0,
  size = 20,
  opts?: FinTitulosListFilters,
): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "cadastroEm,desc",
  });
  appendFinTitulosListFilterParams(params, opts);
  return `${base}?${params.toString()}`;
}

export function getFinTituloContextoLoteUrl(
  empreendimento: string,
  quadra: string,
  lote: number,
): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    empreendimento: empreendimento.trim(),
    quadra: quadra.trim(),
    lote: String(lote),
  });
  return `${base}/contexto-lote?${params.toString()}`;
}

export function getFinTituloLegadoManualQuadrasUrl(empreendimento: string): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams({ empreendimento: empreendimento.trim() });
  return `${base}/legado-manual/quadras?${params.toString()}`;
}

export function getFinTituloLegadoManualLotesUrl(
  empreendimento: string,
  quadra: string,
): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    empreendimento: empreendimento.trim(),
    quadra: quadra.trim(),
  });
  return `${base}/legado-manual/lotes?${params.toString()}`;
}

export function getFinTituloByIdUrl(id: string): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getFinTituloHistoricoUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/historico`;
}

export function getFinTituloLegadoManualUrl(): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  return `${base}/legado-manual`;
}

export function getFinTituloLegadoManualByIdUrl(id: string): string {
  const base = getFinTituloByIdUrl(id);
  if (!base) return "";
  return `${base}/legado-manual`;
}

export function getFinTituloAvulsoUrl(): string {
  const base = getFinTitulosUrl();
  if (!base) return "";
  return `${base}/avulso`;
}

export function getFinCobrancaGruposUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finCobrancaGrupos);
}

export function getFinCobrancaGruposSugestoesUrl(): string {
  const base = getFinCobrancaGruposUrl();
  if (!base) return "";
  return `${base}/sugestoes`;
}

export function getFinCobrancaGrupoByIdUrl(id: string): string {
  const base = getFinCobrancaGruposUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getFinCobrancaGrupoSimularUrl(id: string): string {
  return `${getFinCobrancaGrupoByIdUrl(id)}/simular-emissao`;
}

export function getFinCobrancaGrupoEmitirUrl(id: string): string {
  return `${getFinCobrancaGrupoByIdUrl(id)}/emitir`;
}

export function getFinCobrancaGrupoLiderUrl(id: string): string {
  return `${getFinCobrancaGrupoByIdUrl(id)}/lider`;
}

export function getFinCobrancaGrupoMembrosUrl(id: string): string {
  return `${getFinCobrancaGrupoByIdUrl(id)}/membros`;
}

export function getFinCobrancaGrupoDesativarUrl(id: string): string {
  return `${getFinCobrancaGrupoByIdUrl(id)}/desativar`;
}

export function getFinTituloRegistrarUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/registrar`;
}

export function getFinTituloWhatsAppCobrancaParcelaUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/whatsapp/cobranca-parcela`;
}

export function getFinTituloCancelarUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/cancelar`;
}

export function getFinTituloSincronizarStatusUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/sincronizar-status`;
}

export function getFinTituloLiquidarUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/liquidar`;
}

export function getFinTituloPdfUrl(id: string): string {
  return `${getFinTituloByIdUrl(id)}/pdf`;
}

export function getFinConveniosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finConvenios);
}

export function getFinConveniosGestaoUrl(): string {
  return `${getFinConveniosUrl()}/gestao`;
}

export function getFinConvenioAtivoUrl(id: string): string {
  return `${getFinConveniosUrl()}/${id}/ativo`;
}

export function getFinConveniosEmpreendimentosUrl(): string {
  return `${getFinConveniosUrl()}/empreendimentos`;
}

export function getFinConvenioEmpreendimentoUrl(nomeEmpreendimento: string): string {
  return `${getFinConveniosEmpreendimentosUrl()}/${encodeURIComponent(nomeEmpreendimento)}`;
}

export function getFinDashboardResumoUrl(): string {
  return withBase(getApiBaseUrl(), `${API_PATHS.finDashboard}/resumo`);
}

export function getFinFluxoReceitaUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finFluxoReceita);
}

export function getFinIndicesIpcaUrl(opts?: { desde?: string; ate?: string }): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIpca);
  if (!base) return "";
  const params = new URLSearchParams();
  if (opts?.desde) params.set("desde", opts.desde);
  if (opts?.ate) params.set("ate", opts.ate);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getFinIndicesIpcaUltimoUrl(): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIpca);
  if (!base) return "";
  return `${base}/ultimo`;
}

export function getFinIndicesIpcaSincronizarUrl(): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIpca);
  if (!base) return "";
  return `${base}/sincronizar`;
}

export function getFinIndicesIgpmUrl(opts?: { desde?: string; ate?: string }): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIgpm);
  if (!base) return "";
  const params = new URLSearchParams();
  if (opts?.desde) params.set("desde", opts.desde);
  if (opts?.ate) params.set("ate", opts.ate);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getFinIndicesIgpmUltimoUrl(): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIgpm);
  if (!base) return "";
  return `${base}/ultimo`;
}

export function getFinIndicesIgpmSincronizarUrl(): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finIndicesIgpm);
  if (!base) return "";
  return `${base}/sincronizar`;
}

export function getFinReajusteSimularUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finReajusteSimular);
}

export function getFinCobrancaReguaUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finCobrancaRegua);
}

export function getFinCobrancaReguaAtivaUrl(id: string): string {
  return `${getFinCobrancaReguaUrl()}/${id}/ativa`;
}

export function getFinCobrancaReguaEtapasUrl(reguaId: string): string {
  return `${getFinCobrancaReguaUrl()}/${reguaId}/etapas`;
}

export function getFinCobrancaReguaEtapaUrl(reguaId: string, etapaId: string): string {
  return `${getFinCobrancaReguaEtapasUrl(reguaId)}/${etapaId}`;
}

export function getFinCobrancaReguaExecucoesUrl(): string {
  return `${getFinCobrancaReguaUrl()}/execucoes`;
}

export function getFinCobrancaReguaExecutarJobUrl(): string {
  return `${getFinCobrancaReguaUrl()}/jobs/executar`;
}

export function getFinCobrancaReguaTesteUrl(): string {
  return `${getFinCobrancaReguaUrl()}/teste`;
}

export function getFinCobrancaReguaTesteTituloResolvidoUrl(
  contratanteId: number,
  etapaId: string,
): string {
  const params = new URLSearchParams({
    contratanteId: String(contratanteId),
    etapaId,
  });
  return `${getFinCobrancaReguaUrl()}/teste/titulo-resolvido?${params.toString()}`;
}

export function getFinLancamentosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finLancamentos);
}

export function getFinLancamentosListUrl(
  page = 0,
  size = 20,
  opts?: {
    contrato?: string;
    conta?: string;
    tituloId?: string;
    competenciaDe?: string;
    competenciaAte?: string;
    imovelId?: number;
    q?: string;
  },
): string {
  const base = getFinLancamentosUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "competencia,desc",
  });
  if (opts?.contrato?.trim()) params.set("contrato", opts.contrato.trim());
  if (opts?.conta?.trim()) params.set("conta", opts.conta.trim());
  if (opts?.imovelId != null) params.set("imovelId", String(opts.imovelId));
  if (opts?.tituloId) params.set("tituloId", opts.tituloId);
  if (opts?.competenciaDe) params.set("competenciaDe", opts.competenciaDe);
  if (opts?.competenciaAte) params.set("competenciaAte", opts.competenciaAte);
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  return `${base}?${params.toString()}`;
}

export function getFinLancamentoByIdUrl(id: string): string {
  const base = getFinLancamentosUrl();
  if (!base) return "";
  return `${base}/${id}`;
}

export function getFinPorImovelUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finPorImovel);
}

export function getFinPorImovelListUrl(
  page = 0,
  size = 20,
  opts?: { empreendimento?: string; quadra?: string; lote?: number; q?: string },
): string {
  const base = getFinPorImovelUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "empreendimento,asc",
  });
  if (opts?.empreendimento) params.set("empreendimento", opts.empreendimento);
  if (opts?.quadra) params.set("quadra", opts.quadra);
  if (opts?.lote != null) params.set("lote", String(opts.lote));
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  return `${base}?${params.toString()}`;
}

export function getFinPorImovelByIdUrl(imovelId: number): string {
  const base = getFinPorImovelUrl();
  if (!base) return "";
  return `${base}/${imovelId}`;
}

// ---------------------------------------------------------------------------
// Atendimento
// ---------------------------------------------------------------------------

export function getAtendimentoUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.atendimento);
}

export function getAtendimentoBuscaUrl(
  page = 0,
  size = 20,
  filters?: {
    contrato?: string;
    empreendimentos?: string[];
    quadras?: string[];
    lotes?: number[];
    nome?: string;
    cpf?: string;
    celular?: string;
    situacoesFinanceiras?: string[];
  },
): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "contratoId,desc",
  });
  if (filters?.contrato?.trim()) params.set("contrato", filters.contrato.trim());
  for (const emp of filters?.empreendimentos ?? []) {
    if (emp.trim()) params.append("empreendimento", emp.trim());
  }
  for (const qd of filters?.quadras ?? []) {
    if (qd.trim()) params.append("quadra", qd.trim());
  }
  for (const lt of filters?.lotes ?? []) {
    params.append("lote", String(lt));
  }
  if (filters?.nome?.trim()) params.set("nome", filters.nome.trim());
  if (filters?.cpf?.trim()) params.set("cpf", filters.cpf.trim());
  if (filters?.celular?.trim()) params.set("celular", filters.celular.trim());
  for (const sit of filters?.situacoesFinanceiras ?? []) {
    params.append("situacaoFinanceiro", sit);
  }
  return `${base}/busca?${params.toString()}`;
}

export function getAtendimentoPainelUrl(contratoId: number): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/contratos/${contratoId}/painel`;
}

export function getAtendimentoOcorrenciasUrl(contratoId: number): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/contratos/${contratoId}/ocorrencias`;
}

export function getAtendimentoCobrancaBoletoUnicoUrl(contratoId: number): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/contratos/${contratoId}/cobranca/boleto-unico`;
}

export function getAtendimentoCobrancaParcelamentoUrl(contratoId: number): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/contratos/${contratoId}/cobranca/parcelamento`;
}

export function getAtendimentoCobrancaEntradaParcelasUrl(contratoId: number): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/contratos/${contratoId}/cobranca/entrada-parcelas`;
}

export function getAtendimentoCobrancaPdfUrl(tituloId: string): string {
  const base = getAtendimentoUrl();
  if (!base) return "";
  return `${base}/cobranca/${tituloId}/pdf`;
}

export function getFinPlanoContasSaldosUrl(opts?: {
  competenciaDe?: string;
  competenciaAte?: string;
  q?: string;
  apenasComMovimento?: boolean;
}): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.finPlanoContas);
  if (!base) return "";
  const params = new URLSearchParams();
  if (opts?.competenciaDe) params.set("competenciaDe", opts.competenciaDe);
  if (opts?.competenciaAte) params.set("competenciaAte", opts.competenciaAte);
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.apenasComMovimento) params.set("apenasComMovimento", "true");
  const qs = params.toString();
  return qs ? `${base}/saldos?${qs}` : `${base}/saldos`;
}

export function getFinConciliacaoUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finConciliacao);
}

export function getFinConciliacaoSessoesUrl(): string {
  const base = getFinConciliacaoUrl();
  return base ? `${base}/sessoes` : "";
}

export function getFinConciliacaoSessaoUrl(id: string): string {
  const base = getFinConciliacaoSessoesUrl();
  return base ? `${base}/${id}` : "";
}

export function getFinConciliacaoMovimentosSistemaUrl(id: string): string {
  return `${getFinConciliacaoSessaoUrl(id)}/movimentos-sistema`;
}

export function getFinConciliacaoExtratoUrl(id: string): string {
  return `${getFinConciliacaoSessaoUrl(id)}/extrato`;
}

export function getFinConciliacaoMatchingUrl(id: string): string {
  return `${getFinConciliacaoSessaoUrl(id)}/matching`;
}

export function getFinConciliacaoFecharUrl(id: string): string {
  return `${getFinConciliacaoSessaoUrl(id)}/fechar`;
}

export function getFinConciliacaoRelatorioUrl(id: string): string {
  return `${getFinConciliacaoSessaoUrl(id)}/relatorio`;
}

export function getFinUnicredWebhookConciliacaoUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.finUnicredWebhookConciliacao);
}

export function getFinUnicredWebhookConciliacaoListUrl(
  page = 0,
  size = 20,
  status?: string,
): string {
  const base = getFinUnicredWebhookConciliacaoUrl();
  if (!base) return "";
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  return `${base}?${params.toString()}`;
}

export function getFinUnicredWebhookConciliacaoPendentesUrl(): string {
  const base = getFinUnicredWebhookConciliacaoUrl();
  return base ? `${base}/pendentes/contagem` : "";
}

export function getFinUnicredWebhookConciliacaoByIdUrl(id: string): string {
  const base = getFinUnicredWebhookConciliacaoUrl();
  return base ? `${base}/${id}` : "";
}

export function getFinUnicredWebhookConciliacaoVincularUrl(id: string): string {
  return `${getFinUnicredWebhookConciliacaoByIdUrl(id)}/vincular`;
}

export function getFinUnicredWebhookConciliacaoCriarTituloUrl(id: string): string {
  return `${getFinUnicredWebhookConciliacaoByIdUrl(id)}/criar-titulo`;
}

export function getFinUnicredWebhookConciliacaoIgnorarUrl(id: string): string {
  return `${getFinUnicredWebhookConciliacaoByIdUrl(id)}/ignorar`;
}

export function getFinUnicredWebhookConciliacaoReprocessarUrl(id: string): string {
  return `${getFinUnicredWebhookConciliacaoByIdUrl(id)}/reprocessar`;
}

export type AuditoriaAtividadesQuery = {
  q?: string;
  modulo?: string;
  acao?: string;
  usuarioId?: number;
  entidadeTipo?: string;
  entidadeId?: number;
  dataInicio?: string;
  dataFim?: string;
};

export function getAuditoriaAtividadesUrl(
  page = 0,
  size = 20,
  query?: AuditoriaAtividadesQuery,
): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.auditoria);
  if (!base) return "";
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "dataHora,desc",
  });
  const q = query?.q?.trim();
  if (q) params.set("q", q);
  if (query?.modulo) params.set("modulo", query.modulo);
  if (query?.acao) params.set("acao", query.acao);
  if (query?.usuarioId != null) params.set("usuarioId", String(query.usuarioId));
  if (query?.entidadeTipo) params.set("entidadeTipo", query.entidadeTipo);
  if (query?.entidadeId != null) params.set("entidadeId", String(query.entidadeId));
  if (query?.dataInicio) params.set("dataInicio", query.dataInicio);
  if (query?.dataFim) params.set("dataFim", query.dataFim);
  return `${base}/atividades?${params.toString()}`;
}

export function getCrmLeadsKanbanUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmLeadsKanban);
}

export function getCrmLeadsUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmLeads);
}

export function getCrmLeadByIdUrl(id: number): string {
  return `${getCrmLeadsUrl()}/${id}`;
}

export function getCrmLeadInteracoesUrl(id: number): string {
  return `${getCrmLeadByIdUrl(id)}/interacoes`;
}

export function getCrmLeadQualificacaoUrl(id: number): string {
  return `${getCrmLeadByIdUrl(id)}/qualificacao`;
}

export function getCrmLeadMoverEtapaUrl(id: number): string {
  return `${getCrmLeadByIdUrl(id)}/mover-etapa`;
}

export function getCrmLeadConverterUrl(id: number): string {
  return `${getCrmLeadByIdUrl(id)}/converter`;
}

export function getCrmLeadAtribuicaoUrl(id: number): string {
  return `${getCrmLeadByIdUrl(id)}/atribuicao`;
}

export function getCrmFunilEtapasUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmFunilEtapas);
}

export function getCrmFunilEventosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmFunilEventos);
}

export function getCrmFunilAcoesTiposUrl(evento?: string): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.crmFunilAcoesTipos);
  if (!base) return "";
  if (!evento?.trim()) return base;
  return `${base}?evento=${encodeURIComponent(evento.trim())}`;
}

export function getCrmFunilCardAcoesUrl(evento?: string, config = false): string {
  const path = config ? `${API_PATHS.crmFunilCardAcoes}/config` : API_PATHS.crmFunilCardAcoes;
  const base = withBase(getApiBaseUrl(), path);
  if (!base) return "";
  if (!evento?.trim()) return base;
  return `${base}?evento=${encodeURIComponent(evento.trim())}`;
}

export function getCrmFunilGatilhosUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmFunilGatilhos);
}

export function getCrmCampanhasUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmCampanhas);
}

export function getCrmCaptacaoPublicUrl(): string {
  return withBase(getApiBaseUrl(), API_PATHS.crmCaptacaoPublica);
}

export function getTenantFeatureUrl(chave: string): string {
  const base = withBase(getApiBaseUrl(), API_PATHS.tenantsMeFeatures);
  return `${base}?chave=${encodeURIComponent(chave)}`;
}
