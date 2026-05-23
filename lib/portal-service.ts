import { getApiBaseUrl } from "./api-config";
import { portalFetch } from "./portal-fetch";

export type PortalParcela = {
  id: string;
  contratoId: number;
  numeroContrato: string;
  numeroParcela: number;
  status: string;
  valorNominal: number;
  vencimento: string;
  vencido: boolean;
};

export type PortalPagamento = {
  tituloId: string;
  pixCopiaCola: string | null;
  linhaDigitavel: string | null;
  urlBoleto: string | null;
  pdfDisponivel: boolean;
};

export type PortalContrato = {
  id: number;
  numeroContrato: string;
  status: string;
  empreendimento: string | null;
  quadra: string | null;
  lote: number | null;
};

function portalUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function portalCadastrar(body: {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
}): Promise<{ contratanteId: number; mensagem: string }> {
  const res = await portalFetch(portalUrl("/api/portal/cadastro"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    skipLoading: true,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Erro no cadastro");
  }
  return res.json();
}

export async function portalSolicitarOtp(cpf: string): Promise<{
  mensagem: string;
  expiraEmMinutos: number;
  devOtpExposto?: boolean;
  devOtp?: string | null;
}> {
  const res = await portalFetch(portalUrl("/api/portal/auth/cpf"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
    skipLoading: true,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Não foi possível enviar o código");
  }
  return res.json();
}

export async function portalVerificarOtp(
  cpf: string,
  codigo: string
): Promise<{ token: string; contratanteId: number; nome: string }> {
  const res = await portalFetch(portalUrl("/api/portal/auth/verificar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf, codigo }),
    skipLoading: true,
  });
  if (!res.ok) {
    throw new Error("Código inválido ou expirado");
  }
  const data = await res.json();
  return { token: data.token, contratanteId: data.contratanteId, nome: data.nome };
}

export async function portalListarParcelas(): Promise<PortalParcela[]> {
  const res = await portalFetch(portalUrl("/api/portal/parcelas"));
  if (!res.ok) throw new Error("Erro ao carregar parcelas");
  return res.json();
}

export async function portalPagamento(tituloId: string): Promise<PortalPagamento> {
  const res = await portalFetch(portalUrl(`/api/portal/parcelas/${tituloId}/pagamento`));
  if (!res.ok) throw new Error("Erro ao carregar dados de pagamento");
  return res.json();
}

export function portalPdfBoletoUrl(tituloId: string): string {
  return portalUrl(`/api/portal/parcelas/${tituloId}/pdf`);
}

export async function portalListarContratos(): Promise<PortalContrato[]> {
  const res = await portalFetch(portalUrl("/api/portal/contratos"));
  if (!res.ok) throw new Error("Erro ao carregar contratos");
  return res.json();
}

export function portalContratoPdfUrl(contratoId: number): string {
  return portalUrl(`/api/portal/contratos/${contratoId}/pdf-assinado`);
}
