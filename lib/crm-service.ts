import { apiFetch } from "./api-fetch";
import {
  getCrmCampanhasUrl,
  getCrmFunilAcoesTiposUrl,
  getCrmFunilCardAcoesUrl,
  getCrmFunilGatilhosUrl,
  getCrmFunilEtapasUrl,
  getCrmFunilEventosUrl,
  getCrmLeadByIdUrl,
  getCrmLeadAtribuicaoUrl,
  getCrmLeadConverterUrl,
  getCrmLeadInteracoesUrl,
  getCrmLeadQualificacaoUrl,
  getCrmLeadMoverEtapaUrl,
  getCrmLeadsKanbanUrl,
  getCrmLeadsUrl,
  getTenantFeatureUrl,
} from "./api-config";

export type LeadOrigem =
  | "MANUAL"
  | "FORMULARIO"
  | "META"
  | "GOOGLE"
  | "INDICACAO"
  | "TELEFONE"
  | "WHATSAPP"
  | "OUTRO";

export type LeadTemperatura = "FRIO" | "MORNO" | "QUENTE";

export type FunilAcaoCodigo = "ATRIBUICAO" | "QUALIFICACAO" | "INTERACAO" | "CONVERTER_CLIENTE";

export type FunilEventoCodigo =
  | "CARD_ACAO_CLIQUE"
  | "LEAD_ETAPA_ALTERADA"
  | "LEAD_CRIADO"
  | "LEAD_TEMPERATURA_ALTERADA";

export type FunilAcaoTipoExibicao = "ICON" | "BUTTON";

export interface FunilCardAcaoCondicao {
  requerNaoCliente?: boolean;
  etapaIds?: number[];
  temperaturas?: LeadTemperatura[];
  requerCadastroIncompleto?: boolean;
}

export interface FunilEventoDto {
  codigo: FunilEventoCodigo;
  nome: string;
  descricao: string | null;
  categoria: string;
}

export interface FunilAcaoTipoDto {
  codigo: FunilAcaoCodigo;
  nome: string;
  descricao: string | null;
  eventoCodigo: FunilEventoCodigo;
  icone: string | null;
  tipoExibicao: FunilAcaoTipoExibicao;
  ordemPadrao: number;
  condicaoPadrao: FunilCardAcaoCondicao | null;
}

export interface FunilCardAcaoDto {
  id: number;
  acaoCodigo: FunilAcaoCodigo;
  eventoCodigo: FunilEventoCodigo;
  rotulo: string;
  nomePadrao: string;
  descricao: string | null;
  icone: string | null;
  tipoExibicao: FunilAcaoTipoExibicao;
  ordem: number;
  ativo: boolean;
  condicao: FunilCardAcaoCondicao | null;
}

export interface FunilCardAcaoSaveItem {
  acaoCodigo: FunilAcaoCodigo;
  eventoCodigo: FunilEventoCodigo;
  rotulo?: string | null;
  ordem: number;
  ativo: boolean;
  condicao?: FunilCardAcaoCondicao | null;
}

export type FunilGatilhoDestinatario = "CORRETOR" | "LEAD";

export interface FunilGatilhoCondicao {
  etapasDestinoIds?: number[] | null;
}

export interface FunilGatilhoDto {
  id: number | null;
  eventoCodigo: FunilEventoCodigo;
  eventoNome: string;
  canal: string;
  destinatario: FunilGatilhoDestinatario | null;
  templateId: string | null;
  templateNome: string | null;
  linhaId: string | null;
  linhaNome: string | null;
  ativo: boolean;
  condicao: FunilGatilhoCondicao | null;
}

export interface FunilGatilhoSavePayload {
  eventoCodigo: FunilEventoCodigo;
  destinatario: FunilGatilhoDestinatario;
  templateId: string | null;
  linhaId?: string | null;
  ativo: boolean;
  condicao?: FunilGatilhoCondicao | null;
}

export type LeadInteracaoTipo = "NOTA" | "LIGACAO" | "WHATSAPP" | "EMAIL" | "VISITA";

export interface LeadAtividadeDto {
  id: number;
  tipo: LeadInteracaoTipo | "MUDANCA_ETAPA" | "CONVERSAO" | "CAPTACAO" | "NOTA";
  descricao: string | null;
  usuarioId: number | null;
  usuarioNome: string | null;
  dtAtividade: string;
}

export interface FunilEtapaDto {
  id: number;
  codigo: string;
  nome: string;
  ordem: number;
  corHex: string | null;
  finalGanho: boolean;
  finalPerdido: boolean;
  totalLeads: number;
}

export interface LeadDto {
  id: number;
  funilEtapaId: number;
  funilEtapaNome: string;
  funilEtapaCodigo: string;
  ordemKanban: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  origem: LeadOrigem;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  score: number;
  temperatura: LeadTemperatura;
  empreendimentoInteresse: string | null;
  imovelId: number | null;
  corretorId: number | null;
  imobiliariaId: number | null;
  contratanteId: number | null;
  motivoPerda: string | null;
  observacoes: string | null;
  campanhaId: number | null;
  dtCadastro: string;
  dtUltimoContato: string | null;
  rg: string | null;
  orgaoEmissor: string | null;
  sexo: string | null;
  dataNascimento: string | null;
  estadoCivil: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  cadastroClienteCompleto: boolean;
  percentualCadastroCliente: number;
  camposPendentesCadastro: string[];
}

export interface LeadQualificacaoPayload {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  empreendimentoInteresse?: string;
  rg?: string;
  orgaoEmissor?: string;
  sexo?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  profissao?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface KanbanColumnDto {
  etapaId: number;
  codigo: string;
  nome: string;
  corHex: string | null;
  ordem: number;
  finalGanho: boolean;
  finalPerdido: boolean;
  leads: LeadDto[];
}

export interface KanbanBoardDto {
  colunas: KanbanColumnDto[];
  totalLeads: number;
}

export interface LeadCreatePayload {
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  origem?: LeadOrigem;
  funilEtapaId?: number;
  empreendimentoInteresse?: string;
  campanhaId?: number;
  corretorId?: number;
  imobiliariaId?: number;
  score?: number;
  temperatura?: LeadTemperatura;
  observacoes?: string;
}

export interface LeadAtribuicaoPayload {
  campanhaId: number | null;
  corretorId: number | null;
  imobiliariaId: number | null;
}

export interface LeadMoverEtapaPayload {
  funilEtapaId: number;
  ordemKanban?: number;
  motivoPerda?: string;
}

export interface LeadInteracaoPayload {
  tipo: LeadInteracaoTipo;
  descricao: string;
  temperatura?: LeadTemperatura;
}

export interface LeadUpdatePayload {
  temperatura?: LeadTemperatura;
  observacoes?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* texto bruto */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function isCrmFunilEnabled(): Promise<boolean> {
  const res = await apiFetch(getTenantFeatureUrl("CRM_FUNIL"), { skipLoading: true });
  if (!res.ok) return false;
  const data = (await res.json()) as { habilitado?: boolean };
  return Boolean(data.habilitado);
}

export async function fetchKanban(): Promise<KanbanBoardDto> {
  const res = await apiFetch(getCrmLeadsKanbanUrl(), { skipLoading: true });
  return parseJson<KanbanBoardDto>(res);
}

export async function fetchFunilEtapas(): Promise<FunilEtapaDto[]> {
  const res = await apiFetch(getCrmFunilEtapasUrl(), { skipLoading: true });
  return parseJson<FunilEtapaDto[]>(res);
}

export async function fetchFunilEventos(): Promise<FunilEventoDto[]> {
  const res = await apiFetch(getCrmFunilEventosUrl(), { skipLoading: true });
  return parseJson<FunilEventoDto[]>(res);
}

export async function fetchFunilAcaoTipos(evento?: string): Promise<FunilAcaoTipoDto[]> {
  const res = await apiFetch(getCrmFunilAcoesTiposUrl(evento), { skipLoading: true });
  return parseJson<FunilAcaoTipoDto[]>(res);
}

export async function fetchFunilCardAcoes(evento?: string): Promise<FunilCardAcaoDto[]> {
  const res = await apiFetch(getCrmFunilCardAcoesUrl(evento, false), { skipLoading: true });
  return parseJson<FunilCardAcaoDto[]>(res);
}

export async function fetchFunilCardAcoesConfig(evento?: string): Promise<FunilCardAcaoDto[]> {
  const res = await apiFetch(getCrmFunilCardAcoesUrl(evento, true), { skipLoading: true });
  return parseJson<FunilCardAcaoDto[]>(res);
}

export async function fetchFunilGatilhos(): Promise<FunilGatilhoDto[]> {
  const res = await apiFetch(getCrmFunilGatilhosUrl(), { skipLoading: true });
  return parseJson<FunilGatilhoDto[]>(res);
}

export async function saveFunilGatilho(payload: FunilGatilhoSavePayload): Promise<FunilGatilhoDto> {
  const res = await apiFetch(getCrmFunilGatilhosUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<FunilGatilhoDto>(res);
}

export async function saveFunilCardAcoes(
  eventoCodigo: FunilEventoCodigo,
  acoes: FunilCardAcaoSaveItem[],
): Promise<FunilCardAcaoDto[]> {
  const res = await apiFetch(getCrmFunilCardAcoesUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventoCodigo, acoes }),
    skipLoading: true,
  });
  return parseJson<FunilCardAcaoDto[]>(res);
}

export async function createLead(payload: LeadCreatePayload): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function moverLeadEtapa(
  leadId: number,
  payload: LeadMoverEtapaPayload,
): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadMoverEtapaUrl(leadId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function updateLead(leadId: number, payload: LeadUpdatePayload): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadByIdUrl(leadId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function atualizarLeadAtribuicao(
  leadId: number,
  payload: LeadAtribuicaoPayload,
): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadAtribuicaoUrl(leadId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function atualizarLeadQualificacao(
  leadId: number,
  payload: LeadQualificacaoPayload,
): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadQualificacaoUrl(leadId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function fetchLeadInteracoes(leadId: number): Promise<LeadAtividadeDto[]> {
  const res = await apiFetch(getCrmLeadInteracoesUrl(leadId), { skipLoading: true });
  return parseJson<LeadAtividadeDto[]>(res);
}

export async function registrarLeadInteracao(
  leadId: number,
  payload: LeadInteracaoPayload,
): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadInteracoesUrl(leadId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function converterLead(leadId: number, cpf: string): Promise<LeadDto> {
  const res = await apiFetch(getCrmLeadConverterUrl(leadId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
    skipLoading: true,
  });
  return parseJson<LeadDto>(res);
}

export async function fetchCampanhas(): Promise<
  { id: number; slug: string; nome: string; canal: string; ativo: boolean }[]
> {
  const res = await apiFetch(getCrmCampanhasUrl(), { skipLoading: true });
  return parseJson(res);
}
