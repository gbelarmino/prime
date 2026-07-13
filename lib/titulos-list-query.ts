/** Query string da lista de títulos (preservar ao ir/voltar do detalhe). */

export type TitulosListQueryState = {
  status: string;
  contrato: string;
  nome: string;
  cpf: string;
  nossoNumero: string;
  empreendimento: string;
  quadra: string;
  lote: number | null;
  vencimentoDe: string;
  vencimentoAte: string;
  emissaoDe: string;
  emissaoAte: string;
  pagamentoDe: string;
  pagamentoAte: string;
  page: number;
  sortField: string;
  sortOrder: number;
};

export const TITULOS_LIST_DEFAULT_SORT_FIELD = "cadastroEm";
export const TITULOS_LIST_DEFAULT_SORT_ORDER = -1;

export function parseTitulosListQuery(
  params: URLSearchParams | { get(name: string): string | null },
): TitulosListQueryState {
  const loteRaw = params.get("lote");
  const lote =
    loteRaw != null && loteRaw !== "" && Number.isFinite(Number(loteRaw))
      ? Number(loteRaw)
      : null;
  const pageRaw = params.get("page");
  const page =
    pageRaw != null && /^\d+$/.test(pageRaw) ? Math.max(0, Number(pageRaw)) : 0;
  const sortOrderRaw = params.get("sortOrder");
  let sortOrder = TITULOS_LIST_DEFAULT_SORT_ORDER;
  if (sortOrderRaw === "1" || sortOrderRaw === "-1") {
    sortOrder = Number(sortOrderRaw);
  }
  return {
    status: params.get("status") ?? "",
    contrato: params.get("contrato") ?? "",
    nome: params.get("nome") ?? "",
    cpf: params.get("cpf") ?? "",
    nossoNumero: params.get("nossoNumero") ?? "",
    empreendimento: params.get("empreendimento") ?? "",
    quadra: params.get("quadra") ?? "",
    lote,
    vencimentoDe: params.get("vencimentoDe") ?? "",
    vencimentoAte: params.get("vencimentoAte") ?? "",
    emissaoDe: params.get("emissaoDe") ?? "",
    emissaoAte: params.get("emissaoAte") ?? "",
    pagamentoDe: params.get("pagamentoDe") ?? "",
    pagamentoAte: params.get("pagamentoAte") ?? "",
    page,
    sortField: params.get("sortField") ?? TITULOS_LIST_DEFAULT_SORT_FIELD,
    sortOrder,
  };
}

export function buildTitulosListQuery(state: TitulosListQueryState): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value == null) return;
    const s = String(value).trim();
    if (!s) return;
    params.set(key, s);
  };

  set("status", state.status);
  set("contrato", state.contrato);
  set("nome", state.nome);
  set("cpf", state.cpf);
  set("nossoNumero", state.nossoNumero);
  set("empreendimento", state.empreendimento);
  set("quadra", state.quadra);
  if (state.lote != null) set("lote", state.lote);
  set("vencimentoDe", state.vencimentoDe);
  set("vencimentoAte", state.vencimentoAte);
  set("emissaoDe", state.emissaoDe);
  set("emissaoAte", state.emissaoAte);
  set("pagamentoDe", state.pagamentoDe);
  set("pagamentoAte", state.pagamentoAte);
  if (state.page > 0) set("page", state.page);
  if (state.sortField && state.sortField !== TITULOS_LIST_DEFAULT_SORT_FIELD) {
    set("sortField", state.sortField);
  }
  if (state.sortOrder !== TITULOS_LIST_DEFAULT_SORT_ORDER) {
    set("sortOrder", state.sortOrder);
  }
  return params.toString();
}

export function titulosListHref(query: string): string {
  const base = "/dashboard/financeiro/titulos";
  return query ? `${base}?${query}` : base;
}

export function titulosDetalheHref(tituloId: string, listQuery: string): string {
  const params = new URLSearchParams();
  params.set("id", tituloId);
  if (listQuery) params.set("ret", listQuery);
  return `/dashboard/financeiro/titulos/detalhe?${params.toString()}`;
}
