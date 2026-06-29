import type { ComponentType } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  Contact,
  FilePlus,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Headset,
  Home,
  Kanban,
  Link2,
  ListOrdered,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Receipt,
  Scale,
  ScrollText,
  Search,
  Send,
  RefreshCw,
  TrendingUp,
  UserSquare,
  Users,
  Zap,
} from "lucide-react";
import { ADMIN_DASHBOARD_HOME, WELCOME_DASHBOARD_PATH } from "@/lib/auth-storage";

export type MenuIcon = ComponentType<{ size?: number; className?: string }>;

export type MenuChildDef = {
  id: string;
  href: string;
  label: string;
  icon: MenuIcon;
  roles?: string[];
};

export type MenuLinkItem = {
  kind: "link";
  id: string;
  href: string;
  label: string;
  icon: MenuIcon;
  roles?: string[];
};

export type MenuGroupItem = {
  kind: "group";
  id: string;
  label: string;
  icon: MenuIcon;
  roles?: string[];
  prefix: string;
  children: MenuChildDef[];
};

export const ATENDIMENTO_MENU_PREFIX = "/dashboard/atendimento";
export const WHATSAPP_MENU_PREFIX = "/dashboard/whatsapp";
export const EMAIL_MENU_PREFIX = "/dashboard/email";
export const SMS_MENU_PREFIX = "/dashboard/sms";
export const RENEGOCIACAO_MENU_PREFIX = "/dashboard/contratos/renegociacao";

export const DASHBOARD_MENU_ITEMS: (MenuLinkItem | MenuGroupItem)[] = [
  {
    kind: "link",
    id: "inicio-admin",
    href: ADMIN_DASHBOARD_HOME,
    label: "Início",
    icon: Home,
    roles: ["ADMIN"],
  },
  {
    kind: "link",
    id: "inicio-welcome",
    href: WELCOME_DASHBOARD_PATH,
    label: "Início",
    icon: Home,
    roles: ["CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "link",
    id: "clientes",
    href: "/dashboard/clientes",
    label: "Clientes",
    icon: Contact,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "link",
    id: "crm-funil",
    href: "/dashboard/crm/funil",
    label: "Funil CRM",
    icon: Kanban,
    roles: ["ADMIN"],
  },
  {
    kind: "link",
    id: "imobiliarias",
    href: "/dashboard/imobiliarias",
    label: "Imobiliárias",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    kind: "link",
    id: "corretores",
    href: "/dashboard/corretores",
    label: "Corretores",
    icon: UserSquare,
    roles: ["ADMIN", "IMOBILIARIA"],
  },
  {
    kind: "link",
    id: "imoveis",
    href: "/dashboard/imoveis",
    label: "Imóveis",
    icon: MapPin,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "link",
    id: "usuarios",
    href: "/dashboard/usuarios",
    label: "Usuários",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    kind: "link",
    id: "auditoria",
    href: "/dashboard/auditoria",
    label: "Auditoria",
    icon: ScrollText,
    roles: ["ADMIN"],
  },
  {
    kind: "link",
    id: "contratos",
    href: "/dashboard/contratos",
    label: "Contratos",
    icon: FileText,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "group",
    id: "grupo-renegociacao",
    label: "Renegociação",
    icon: RefreshCw,
    roles: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
    prefix: RENEGOCIACAO_MENU_PREFIX,
    children: [
      {
        id: "renegociar",
        href: RENEGOCIACAO_MENU_PREFIX,
        label: "Renegociar",
        icon: GitCompareArrows,
      },
      {
        id: "renegociacao-consultar",
        href: `${RENEGOCIACAO_MENU_PREFIX}/consultar`,
        label: "Consultar",
        icon: Search,
      },
    ],
  },
  {
    kind: "group",
    id: "grupo-atendimento",
    label: "Atendimento",
    icon: Headset,
    roles: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
    prefix: ATENDIMENTO_MENU_PREFIX,
    children: [{ id: "atendimento-consulta", href: "/dashboard/atendimento", label: "Consulta", icon: Search }],
  },
  {
    kind: "group",
    id: "grupo-financeiro",
    label: "Financeiro",
    icon: Receipt,
    roles: ["ADMIN", "ADMINISTRATIVO"],
    prefix: "/dashboard/financeiro",
    children: [
      { id: "fin-titulos", href: "/dashboard/financeiro/titulos", label: "Títulos", icon: Receipt },
      { id: "fin-regua-cobranca", href: "/dashboard/financeiro/regua-cobranca", label: "Régua de cobrança", icon: ListOrdered },
      { id: "fin-titulos-avulso", href: "/dashboard/financeiro/titulos-avulso", label: "Título avulso", icon: FilePlus },
      { id: "fin-cobranca-grupos", href: "/dashboard/financeiro/cobranca-grupos", label: "Grupos legado", icon: Users },
      { id: "fin-sim-ipca", href: "/dashboard/financeiro/simulacao-ipca", label: "Simulação IPCA", icon: Calculator },
      { id: "fin-sim-igpm", href: "/dashboard/financeiro/simulacao-igpm", label: "Simulação IGP-M", icon: Calculator },
      { id: "fin-convenios", href: "/dashboard/financeiro/convenios", label: "Convênios", icon: Building2 },
      { id: "fin-conciliacao", href: "/dashboard/financeiro/conciliacao", label: "Conciliação", icon: GitCompareArrows },
      { id: "fin-unicred-webhooks", href: "/dashboard/financeiro/unicred-webhooks", label: "Webhooks Unicred", icon: Link2 },
      {
        id: "fin-unicred-reprocessar",
        href: "/dashboard/financeiro/unicred-webhooks/reprocessar",
        label: "Reprocessar webhooks",
        icon: RefreshCw,
      },
      { id: "fin-lancamentos", href: "/dashboard/financeiro/lancamentos", label: "Lançamentos", icon: BookOpen },
      { id: "fin-fluxo-receita", href: "/dashboard/financeiro/fluxo-receita", label: "Fluxo de receita", icon: BarChart3 },
      { id: "fin-por-imovel", href: "/dashboard/financeiro/por-imovel", label: "Por imóvel", icon: Home },
      { id: "fin-plano-contas", href: "/dashboard/financeiro/plano-contas", label: "Plano de contas", icon: Scale },
      { id: "fin-indices-ipca", href: "/dashboard/financeiro/indices-ipca", label: "IPCA", icon: TrendingUp },
      { id: "fin-indices-igpm", href: "/dashboard/financeiro/indices-igpm", label: "IGP-M", icon: TrendingUp },
    ],
  },
  {
    kind: "link",
    id: "clicksign",
    href: "/dashboard/clicksign",
    label: "Portal Clicksign",
    icon: FileText,
    roles: ["ADMIN"],
  },
  {
    kind: "group",
    id: "grupo-whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
    prefix: WHATSAPP_MENU_PREFIX,
    children: [
      {
        id: "wa-conexao",
        href: "/dashboard/whatsapp/conexao",
        label: "Conexão",
        icon: MessageCircle,
        roles: ["ADMIN", "ATENDIMENTO"],
      },
      { id: "wa-modelos", href: "/dashboard/whatsapp/modelos", label: "Modelos de mensagem", icon: FileText, roles: ["ADMIN"] },
      { id: "wa-gatilhos", href: "/dashboard/whatsapp/gatilhos", label: "Gatilhos automáticos", icon: Zap, roles: ["ADMIN"] },
      { id: "wa-teste", href: "/dashboard/whatsapp/teste", label: "Teste", icon: Send, roles: ["ADMIN"] },
      { id: "wa-teste-eventos", href: "/dashboard/whatsapp/teste-eventos", label: "Teste eventos", icon: FlaskConical, roles: ["ADMIN"] },
      { id: "wa-fila", href: "/dashboard/whatsapp/fila", label: "Fila", icon: ListOrdered, roles: ["ADMIN", "ADMINISTRATIVO"] },
    ],
  },
  {
    kind: "group",
    id: "grupo-email",
    label: "E-mail",
    icon: Mail,
    roles: ["ADMIN", "ADMINISTRATIVO"],
    prefix: EMAIL_MENU_PREFIX,
    children: [
      { id: "email-conta", href: "/dashboard/email/conta", label: "Conta SMTP", icon: Mail, roles: ["ADMIN"] },
      { id: "email-modelos", href: "/dashboard/email/modelos", label: "Modelos de e-mail", icon: FileText, roles: ["ADMIN"] },
      { id: "email-gatilhos", href: "/dashboard/email/gatilhos", label: "Gatilhos automáticos", icon: Zap, roles: ["ADMIN"] },
      { id: "email-teste", href: "/dashboard/email/teste", label: "Teste", icon: Send, roles: ["ADMIN"] },
      { id: "email-teste-eventos", href: "/dashboard/email/teste-eventos", label: "Teste eventos", icon: FlaskConical, roles: ["ADMIN"] },
      { id: "email-fila", href: "/dashboard/email/fila", label: "Fila", icon: ListOrdered, roles: ["ADMIN", "ADMINISTRATIVO"] },
    ],
  },
  {
    kind: "group",
    id: "grupo-sms",
    label: "SMS",
    icon: MessageSquare,
    roles: ["ADMIN", "ADMINISTRATIVO"],
    prefix: SMS_MENU_PREFIX,
    children: [
      { id: "sms-conta", href: "/dashboard/sms/conta", label: "Conta TextBee", icon: MessageSquare, roles: ["ADMIN"] },
      { id: "sms-modelos", href: "/dashboard/sms/modelos", label: "Modelos", icon: FileText, roles: ["ADMIN"] },
      { id: "sms-gatilhos", href: "/dashboard/sms/gatilhos", label: "Gatilhos automáticos", icon: Zap, roles: ["ADMIN"] },
      { id: "sms-teste", href: "/dashboard/sms/teste", label: "Teste", icon: Send, roles: ["ADMIN"] },
      { id: "sms-teste-eventos", href: "/dashboard/sms/teste-eventos", label: "Teste eventos", icon: FlaskConical, roles: ["ADMIN"] },
      { id: "sms-fila", href: "/dashboard/sms/fila", label: "Fila", icon: ListOrdered, roles: ["ADMIN", "ADMINISTRATIVO"] },
    ],
  },
];

export function getMenuItemId(item: MenuLinkItem | MenuGroupItem): string {
  return item.id;
}

export function menuChildVisible(child: MenuChildDef, role: string | null): boolean {
  if (!child.roles) return true;
  return Boolean(role && child.roles.includes(role));
}

export function menuItemVisible(
  item: MenuLinkItem | MenuGroupItem,
  role: string | null,
  crmFunilEnabled: boolean | null,
): boolean {
  if (role === "ATENDIMENTO") {
    if (item.kind === "group" && item.prefix === ATENDIMENTO_MENU_PREFIX) {
      return true;
    }
    if (item.kind === "group" && item.prefix === RENEGOCIACAO_MENU_PREFIX) {
      return true;
    }
    if (item.kind === "group" && item.prefix === WHATSAPP_MENU_PREFIX) {
      return item.children.some((c) => menuChildVisible(c, role));
    }
    return false;
  }
  if (role === "ADMINISTRATIVO") {
    if (!item.roles?.includes("ADMINISTRATIVO")) return false;
    if (item.kind === "group") {
      return item.children.some((c) => menuChildVisible(c, role));
    }
    return true;
  }
  if (!item.roles) return true;
  if (!role || !item.roles.includes(role)) return false;
  if (
    item.kind === "link" &&
    (item.href === "/dashboard/crm/funil" || item.href.startsWith("/dashboard/crm/"))
  ) {
    return crmFunilEnabled === true;
  }
  return true;
}

export function filterVisibleMenuChildren(item: MenuGroupItem, role: string | null): MenuGroupItem {
  return {
    ...item,
    children: item.children.filter((c) => menuChildVisible(c, role)),
  };
}
