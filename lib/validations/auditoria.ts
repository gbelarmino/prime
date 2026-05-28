export type UsuarioAtividadeApi = {
  id: number;
  dataHora: string;
  tenantId?: number | null;
  usuarioId: number | null;
  usuarioEmail: string | null;
  usuarioRole: string | null;
  acao: string;
  modulo: string;
  descricao: string | null;
  entidadeTipo: string | null;
  entidadeId: number | null;
  entidadeUuid: string | null;
  requestId: string | null;
  httpMethod: string | null;
  requestPath: string | null;
  ipOrigem: string | null;
  metadados: Record<string, unknown> | null;
  alteracoes: Record<string, unknown> | null;
};

export const MODULO_AUDITORIA_OPTIONS = [
  { label: "Todos os módulos", value: null as string | null },
  { label: "Autenticação", value: "AUTH" },
  { label: "Usuários", value: "USUARIO" },
  { label: "Imóveis", value: "IMOVEL" },
  { label: "Contratos", value: "CONTRATO" },
  { label: "Financeiro", value: "FIN" },
  { label: "Atendimento", value: "ATENDIMENTO" },
  { label: "Organização", value: "TENANT" },
  { label: "CRM", value: "CRM" },
] as const;

export const ACAO_AUDITORIA_LABELS: Record<string, string> = {
  "AUTH.LOGIN": "Login",
  "AUTH.SENHA_ALTERADA": "Senha alterada",
  "USUARIO.CRIAR": "Usuário criado",
  "USUARIO.EDITAR": "Usuário editado",
  "USUARIO.SITUACAO_ALTERAR": "Situação do usuário",
  "IMOVEL.CRIAR": "Imóvel criado",
  "IMOVEL.EDITAR": "Imóvel editado",
  "CONTRATO.CRIAR": "Contrato criado",
  "CONTRATO.EDITAR": "Contrato editado",
  "CONTRATO.ENVIAR_PROPOSTA": "Proposta enviada",
  "CONTRATO.ENVIAR_ASSINATURA": "Enviado para assinatura",
  "CONTRATO.APROVAR": "Contrato aprovado",
  "CONTRATO.REPROVAR": "Contrato reprovado",
  "CONTRATO.CANCELAR": "Contrato cancelado",
  "CONTRATO.REGISTRO_LEGADO": "Contrato legado registado",
  "CONTRATO.PDF_LEGADO": "PDF legado atualizado",
  "CONTRATO.STATUS_ALTERAR": "Status do contrato alterado",
  "TITULO.CRIAR": "Título criado",
  "TITULO.REGISTRAR": "Título registrado",
  "TITULO.CANCELAR": "Título cancelado",
  "TITULO.LIQUIDAR": "Título liquidado",
  "ATENDIMENTO.RENEGOCIAR": "Renegociação",
};

export function labelAcaoAuditoria(acao: string): string {
  return ACAO_AUDITORIA_LABELS[acao] ?? acao;
}
