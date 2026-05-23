/**
 * Rotas do painel → rótulos para breadcrumb e leitores de tela.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Visão geral",
  inicio: "Início",
  clientes: "Clientes",
  imoveis: "Imóveis",
  imobiliarias: "Imobiliárias",
  corretores: "Corretores",
  contratos: "Contratos",
  novo: "Novo",
  edit: "Editar",
};

export type DashboardCrumb = {
  href: string;
  label: string;
};

export function getDashboardBreadcrumbs(pathname: string): DashboardCrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== "dashboard") {
    return [{ href: "/dashboard", label: "Visão geral" }];
  }

  const crumbs: DashboardCrumb[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`;
    const seg = segments[i] ?? "";
    const label = SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ");
    crumbs.push({ href: acc, label });
  }
  return crumbs;
}
