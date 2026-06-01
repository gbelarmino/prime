"use client";

import { ReactNode, useState, useEffect, useRef, type ComponentType } from "react";
import { addLocale, locale } from "primereact/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Gauge, 
  Users, 
  Building2, 
  UserSquare, 
  MapPin, 
  FileText, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  Search,
  Contact,
  User,
  ChevronDown,
  LayoutGrid,
  Home,
  UserCircle,
  Mail,
  Menu as MenuIcon,
  X,
  MessageCircle,
  Zap,
  Send,
  FlaskConical,
  ListOrdered,
  Receipt,
  FilePlus,
  BookOpen,
  Scale,
  GitCompareArrows,
  Headset,
  Link2,
  ScrollText,
  TrendingUp,
  Calculator,
  Kanban,
  RefreshCw,
} from "lucide-react";
import { Menu } from "primereact/menu";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isAdmin as isAuthAdmin,
  isAuthenticated,
  getUserEmail,
  getUserRole,
  clearAuthSession,
  canAccessDashboardPath,
  getDefaultDashboardPath,
  ADMIN_DASHBOARD_HOME,
  WELCOME_DASHBOARD_PATH,
} from "@/lib/auth-storage";
import { UsuarioPerfilModal } from "@/components/dashboard/UsuarioPerfilModal";
import { MenuItem } from "primereact/menuitem";
import { NotificationBell } from "@/components/notification-bell";
import { WhatsAppHeaderStatus } from "@/components/dashboard/whatsapp/WhatsAppHeaderStatus";
import { TenantSwitcher } from "@/components/dashboard/TenantSwitcher";
import {
  FIN_UNICRED_WEBHOOKS_PATH,
  useUnicredWebhookPendentes,
} from "@/hooks/use-unicred-webhook-pendentes";
import { useRealtimeSocketKeeper } from "@/hooks/use-realtime-socket-keeper";
import { useCrmFunilEnabled } from "@/hooks/use-crm-funil-enabled";

type MenuIcon = ComponentType<{ size?: number; className?: string }>;

type MenuLinkItem = {
  kind: "link";
  href: string;
  label: string;
  icon: MenuIcon;
  roles?: string[];
};

type MenuGroupItem = {
  kind: "group";
  label: string;
  icon: MenuIcon;
  roles?: string[];
  prefix: string;
  children: { href: string; label: string; icon: MenuIcon; roles?: string[] }[];
};

const ATENDIMENTO_MENU_PREFIX = "/dashboard/atendimento";
const WHATSAPP_MENU_PREFIX = "/dashboard/whatsapp";
const EMAIL_MENU_PREFIX = "/dashboard/email";
const CONTRATOS_MENU_PATH = "/dashboard/contratos";
const RENEGOCIACAO_MENU_PREFIX = "/dashboard/contratos/renegociacao";
const RENEGOCIACAO_CONSULTAR_PATH = `${RENEGOCIACAO_MENU_PREFIX}/consultar`;

/** Item de link simples ativo (prefixo de rota, com limite de segmento). */
function isSidebarLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === ADMIN_DASHBOARD_HOME || href === WELCOME_DASHBOARD_PATH) return false;
  if (!pathname.startsWith(href)) return false;
  if (href.length < pathname.length && pathname[href.length] !== "/") return false;
  return true;
}

/** Contratos não compete com o submenu Renegociar/Consultar. */
function isContratosMenuActive(pathname: string): boolean {
  if (pathname.startsWith(RENEGOCIACAO_MENU_PREFIX)) return false;
  return isSidebarLinkActive(pathname, CONTRATOS_MENU_PATH);
}

/** Subitem do grupo Renegociação (Renegociar vs Consultar). */
function isRenegociacaoMenuChildActive(pathname: string, childHref: string): boolean {
  if (childHref === RENEGOCIACAO_MENU_PREFIX) {
    return pathname === childHref;
  }
  if (childHref === RENEGOCIACAO_CONSULTAR_PATH) {
    return pathname === childHref || pathname.startsWith(`${childHref}/`);
  }
  return pathname === childHref || pathname.startsWith(`${childHref}/`);
}

const MENU_ITEMS: (MenuLinkItem | MenuGroupItem)[] = [
  { kind: "link", href: ADMIN_DASHBOARD_HOME, label: "Início", icon: Home, roles: ["ADMIN"] },
  {
    kind: "link",
    href: WELCOME_DASHBOARD_PATH,
    label: "Início",
    icon: Home,
    roles: ["CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "link",
    href: "/dashboard/clientes",
    label: "Clientes",
    icon: Contact,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "link",
    href: "/dashboard/crm/funil",
    label: "Funil CRM",
    icon: Kanban,
    roles: ["ADMIN"],
  },
  { kind: "link", href: "/dashboard/imobiliarias", label: "Imobiliárias", icon: Building2, roles: ["ADMIN"] },
  {
    kind: "link",
    href: "/dashboard/corretores",
    label: "Corretores",
    icon: UserSquare,
    roles: ["ADMIN", "IMOBILIARIA"],
  },
  {
    kind: "link",
    href: "/dashboard/imoveis",
    label: "Imóveis",
    icon: MapPin,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  { kind: "link", href: "/dashboard/usuarios", label: "Usuários", icon: Users, roles: ["ADMIN"] },
  { kind: "link", href: "/dashboard/auditoria", label: "Auditoria", icon: ScrollText, roles: ["ADMIN"] },
  {
    kind: "link",
    href: "/dashboard/contratos",
    label: "Contratos",
    icon: FileText,
    roles: ["ADMIN", "CORRETOR", "IMOBILIARIA", "ADMINISTRATIVO"],
  },
  {
    kind: "group",
    label: "Renegociação",
    icon: RefreshCw,
    roles: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
    prefix: "/dashboard/contratos/renegociacao",
    children: [
      {
        href: "/dashboard/contratos/renegociacao",
        label: "Renegociar",
        icon: GitCompareArrows,
      },
      {
        href: "/dashboard/contratos/renegociacao/consultar",
        label: "Consultar",
        icon: Search,
      },
    ],
  },
  {
    kind: "group",
    label: "Atendimento",
    icon: Headset,
    roles: ["ADMIN", "ATENDIMENTO", "ADMINISTRATIVO"],
    prefix: "/dashboard/atendimento",
    children: [
      { href: "/dashboard/atendimento", label: "Consulta", icon: Search },
    ],
  },
  {
    kind: "group",
    label: "Financeiro",
    icon: Receipt,
    roles: ["ADMIN", "ADMINISTRATIVO"],
    prefix: "/dashboard/financeiro",
    children: [
      { href: "/dashboard/financeiro/titulos", label: "Títulos", icon: Receipt },
      { href: "/dashboard/financeiro/titulos-avulso", label: "Título avulso", icon: FilePlus },
      { href: "/dashboard/financeiro/simulacao-ipca", label: "Simulação IPCA", icon: Calculator },
      { href: "/dashboard/financeiro/simulacao-igpm", label: "Simulação IGP-M", icon: Calculator },
      { href: "/dashboard/financeiro/convenios", label: "Convênios", icon: Building2 },
      { href: "/dashboard/financeiro/conciliacao", label: "Conciliação", icon: GitCompareArrows },
      { href: "/dashboard/financeiro/unicred-webhooks", label: "Webhooks Unicred", icon: Link2 },
      { href: "/dashboard/financeiro/lancamentos", label: "Lançamentos", icon: BookOpen },
      { href: "/dashboard/financeiro/por-imovel", label: "Por imóvel", icon: Home },
      { href: "/dashboard/financeiro/plano-contas", label: "Plano de contas", icon: Scale },
      { href: "/dashboard/financeiro/indices-ipca", label: "IPCA", icon: TrendingUp },
      { href: "/dashboard/financeiro/indices-igpm", label: "IGP-M", icon: TrendingUp },
    ],
  },
  { kind: "link", href: "/dashboard/clicksign", label: "Portal Clicksign", icon: FileText, roles: ["ADMIN"] },
  {
    kind: "group",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: ["ADMIN", "ATENDIMENTO"],
    prefix: WHATSAPP_MENU_PREFIX,
    children: [
      {
        href: "/dashboard/whatsapp/conexao",
        label: "Conexão",
        icon: MessageCircle,
        roles: ["ADMIN", "ATENDIMENTO"],
      },
      { href: "/dashboard/whatsapp/modelos", label: "Modelos de mensagem", icon: FileText, roles: ["ADMIN"] },
      { href: "/dashboard/whatsapp/gatilhos", label: "Gatilhos automáticos", icon: Zap, roles: ["ADMIN"] },
      { href: "/dashboard/whatsapp/teste", label: "Teste", icon: Send, roles: ["ADMIN"] },
      { href: "/dashboard/whatsapp/teste-eventos", label: "Teste eventos", icon: FlaskConical, roles: ["ADMIN"] },
      { href: "/dashboard/whatsapp/fila", label: "Fila", icon: ListOrdered, roles: ["ADMIN"] },
    ],
  },
  {
    kind: "group",
    label: "E-mail",
    icon: Mail,
    roles: ["ADMIN"],
    prefix: EMAIL_MENU_PREFIX,
    children: [
      { href: "/dashboard/email/conta", label: "Conta SMTP", icon: Mail, roles: ["ADMIN"] },
      { href: "/dashboard/email/modelos", label: "Modelos de e-mail", icon: FileText, roles: ["ADMIN"] },
      { href: "/dashboard/email/gatilhos", label: "Gatilhos automáticos", icon: Zap, roles: ["ADMIN"] },
      { href: "/dashboard/email/teste", label: "Teste", icon: Send, roles: ["ADMIN"] },
      { href: "/dashboard/email/teste-eventos", label: "Teste eventos", icon: FlaskConical, roles: ["ADMIN"] },
      { href: "/dashboard/email/fila", label: "Fila", icon: ListOrdered, roles: ["ADMIN"] },
    ],
  },
];

function menuChildVisible(
  child: { roles?: string[] },
  role: string | null,
): boolean {
  if (!child.roles) return true;
  return Boolean(role && child.roles.includes(role));
}

function menuItemVisible(
  item: MenuLinkItem | MenuGroupItem,
  role: string | null,
  crmFunilEnabled: boolean | null,
) {
  if (role === "ATENDIMENTO") {
    if (item.kind === "group" && item.prefix === ATENDIMENTO_MENU_PREFIX) {
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

function MenuDangerBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full border border-rose-500/35 bg-rose-500/20 px-1.5 text-[10px] font-bold tabular-nums text-rose-300">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNavGroup({
  item,
  expanded,
  mobileMenuOpen,
  pathname,
  onNavigate,
  role,
  unicredWebhookPendentes = 0,
}: {
  item: MenuGroupItem;
  expanded: boolean;
  mobileMenuOpen: boolean;
  pathname: string;
  onNavigate: () => void;
  role: string | null;
  unicredWebhookPendentes?: number;
}) {
  const [open, setOpen] = useState(() => pathname.startsWith(item.prefix));
  useEffect(() => {
    if (pathname.startsWith(item.prefix)) setOpen(true);
  }, [pathname, item.prefix]);

  const visibleChildren = item.children.filter((c) => menuChildVisible(c, role));
  const labelsVisible = expanded || mobileMenuOpen;
  const anyActive = pathname.startsWith(item.prefix);
  const ParentIcon = item.icon;
  const firstHref = visibleChildren[0]?.href ?? item.prefix;
  const financeiroUnicredPendentes =
    item.prefix === "/dashboard/financeiro" ? unicredWebhookPendentes : 0;

  if (!labelsVisible) {
    return (
      <div onClick={onNavigate}>
        <Link
          href={firstHref}
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 no-underline group",
            anyActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
        >
          <div
            className={cn(
              "relative shrink-0",
              anyActive ? "text-white" : "text-white/40 group-hover:text-white/80",
            )}
          >
            <ParentIcon size={20} />
            {financeiroUnicredPendentes > 0 ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#071C33] bg-rose-500"
                aria-label={`${financeiroUnicredPendentes} webhooks pendentes`}
              />
            ) : null}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left border-0 bg-transparent cursor-pointer",
          anyActive ? "text-white bg-white/[0.06]" : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className={cn("shrink-0", anyActive ? "text-emerald-400" : "text-white/40")}>
          <ParentIcon size={20} />
        </div>
        <span className="font-medium flex-1">{item.label}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-white/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 ml-3 pl-3 border-l border-white/10">
          {visibleChildren.map((c) => {
            const active =
              item.prefix === RENEGOCIACAO_MENU_PREFIX
                ? isRenegociacaoMenuChildActive(pathname, c.href)
                : pathname === c.href;
            const ChildIcon = c.icon;
            const badgeCount =
              c.href === FIN_UNICRED_WEBHOOKS_PATH ? unicredWebhookPendentes : 0;
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm no-underline transition-all",
                  active
                    ? "bg-blue-600/90 text-white shadow-md shadow-blue-900/30"
                    : "text-white/55 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <ChildIcon size={16} className={cn("shrink-0", active ? "text-white" : "text-white/35")} />
                <span className="min-w-0 flex-1 font-medium">{c.label}</span>
                <MenuDangerBadge count={badgeCount} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [peeking, setPeeking] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const menuUser = useRef<Menu>(null);
  
  const userEmail = mounted ? (getUserEmail() || "...") : "";
  const userInitial = userEmail !== "..." ? userEmail.charAt(0).toUpperCase() : "?";

  useEffect(() => {
    addLocale("pt-BR", {
      firstDayOfWeek: 0,
      dayNames: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
      dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      dayNamesMin: ["D", "S", "T", "Q", "Q", "S", "S"],
      monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
      monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
      today: "Hoje",
      clear: "Limpar",
    });
    locale("pt-BR");
    
    if (!isAuthenticated()) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    setMounted(true);
    setAdmin(isAuthAdmin());
    setRole(getUserRole());
  }, [pathname, router]);

  useEffect(() => {
    if (!mounted) return;
    const currentRole = getUserRole();
    if (!canAccessDashboardPath(pathname, currentRole)) {
      router.replace(getDefaultDashboardPath(currentRole));
    }
  }, [mounted, pathname, router]);

  const isSidebarOpen = expanded || peeking;
  const homeHref = role ? getDefaultDashboardPath(role) : ADMIN_DASHBOARD_HOME;
  const finMenuEnabled = mounted && role === "ADMIN";
  const crmFunilEnabled = useCrmFunilEnabled(mounted && role === "ADMIN");
  const { pendentes: unicredWebhookPendentes } = useUnicredWebhookPendentes(finMenuEnabled);
  useRealtimeSocketKeeper(mounted);

  if (!mounted) return null;

  const handleLogout = () => {
    clearAuthSession();
    toast.success("Sessão encerrada.");
    router.push("/login");
  };

  const userMenuItems: MenuItem[] = [
    {
      label: 'Minha Conta',
      template: (item: any) => (
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">
            Logado como
          </span>
          <span className="text-xs font-semibold text-white/80 truncate block">
            {userEmail}
          </span>
        </div>
      )
    },
    {
      label: 'Perfil',
      icon: <User size={16} className="mr-2" />,
      command: () => setProfileModalVisible(true),
      template: (item: any) => (
        <div 
          onClick={(e) => {
            setProfileModalVisible(true);
            menuUser.current?.hide(e);
          }}
          className="flex items-center px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 cursor-pointer transition-colors group"
        >
          <User size={16} className="mr-3 text-white/20 group-hover:text-amber-500 transition-colors" />
          <span className="text-sm font-medium">Perfil</span>
        </div>
      )
    },
    { 
      separator: true,
      className: "border-white/5"
    },
    {
      label: 'Sair',
      icon: <LogOut size={16} className="mr-2" />,
      command: handleLogout,
      template: (item: any) => (
        <div 
          onClick={handleLogout}
          className="flex items-center px-4 py-3 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors group"
        >
          <LogOut size={16} className="mr-3 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold">Sair da Conta</span>
        </div>
      )
    }
  ];

  const SidebarItem = ({ icon, label, href, expanded }: { icon: ReactNode, label: string, href: string, expanded: boolean }) => {
    const active =
      href === CONTRATOS_MENU_PATH
        ? isContratosMenuActive(pathname)
        : isSidebarLinkActive(pathname, href);
    
    return (
      <Link 
        href={href} 
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 no-underline group",
          active 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
            : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className={cn("shrink-0", active ? "text-white" : "text-white/40 group-hover:text-white/80")}>
          {icon}
        </div>
        {expanded && <span className="font-medium whitespace-nowrap animate-in fade-in duration-300">{label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#020817] text-white overflow-x-hidden">
      {/* Backdrop para mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-opacity animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => !expanded && setPeeking(true)}
        onMouseLeave={() => setPeeking(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] bg-[#071C33] border-r border-white/10 transition-all duration-300 flex flex-col shadow-2xl",
          "md:translate-x-0",
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          !mobileMenuOpen && (isSidebarOpen ? "w-64" : "w-20")
        )}
      >
        {/* Logo + organização (tenant) */}
        <div className="min-h-[5.5rem] flex flex-col justify-center gap-2 px-3 py-3 border-b border-white/5">
          <div className="flex min-h-[70px] w-full items-center justify-between gap-2">
            <Link href={homeHref} className="flex shrink-0 items-center">
              <AppLogo
                boxClassName={cn(
                  "shrink-0",
                  isSidebarOpen || mobileMenuOpen ? "w-[70px] h-[70px]" : "w-14 h-14",
                )}
              />
            </Link>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <button
                className="md:hidden shrink-0 p-2 text-white/40 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {!(isSidebarOpen || mobileMenuOpen) && (
            <div className="h-0" />
          )}
        </div>

        {/* Toggle Button - Apenas Desktop */}
        <button 
          onClick={() => {
            setExpanded(!expanded);
            setPeeking(false);
          }}
          className="hidden md:flex absolute -right-3 top-24 w-6 h-6 bg-blue-600 rounded-full items-center justify-center border border-white/20 hover:bg-blue-500 transition-colors z-50 shadow-lg"
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-2 overflow-y-auto">
          {MENU_ITEMS.filter((item) => menuItemVisible(item, role, crmFunilEnabled)).map((item) =>
            item.kind === "link" ? (
              <div key={item.href} onClick={() => setMobileMenuOpen(false)}>
                <SidebarItem
                  icon={<item.icon size={20} />}
                  label={item.label}
                  href={item.href}
                  expanded={isSidebarOpen || mobileMenuOpen}
                />
              </div>
            ) : (
              <SidebarNavGroup
                key={item.prefix}
                item={item}
                expanded={isSidebarOpen || mobileMenuOpen}
                mobileMenuOpen={mobileMenuOpen}
                pathname={pathname}
                onNavigate={() => setMobileMenuOpen(false)}
                role={role}
                unicredWebhookPendentes={unicredWebhookPendentes}
              />
            )
          )}
        </nav>

        <div className="p-3 border-t border-white/5 flex flex-col gap-2">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-400/10 transition-all group",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium animate-in fade-in duration-300">Sair</span>}
          </button>
        </div>
      </aside>

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        "md:pl-20", // Padding padrão desktop (collapsed)
        isSidebarOpen && "md:pl-64" // Padding desktop expandido (fixo ou hover)
      )}>
        <header className="h-20 bg-[#020817]/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            {/* Botão Menu Mobile */}
            <button 
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon size={24} />
            </button>

            <div className="relative hidden md:block max-w-md w-full ml-4">
              {role !== "ATENDIMENTO" && (
                <>
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Buscar no sistema..."
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 mr-2">
            <TenantSwitcher className="mr-2" />
            <button className="p-2 text-white/40 hover:text-white transition-colors rounded-full">
              <Mail size={22} />
            </button>
            {admin && <NotificationBell />}
            {admin && <WhatsAppHeaderStatus />}
            
            <div className="h-6 w-px bg-white/10 ml-2 mr-4" />

            <Menu 
              model={userMenuItems} 
              popup 
              ref={menuUser} 
              id="user_menu"
              pt={{
                root: { className: 'bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl py-1 w-52 overflow-hidden mt-2' },
                menu: { className: 'bg-transparent' }
              }}
            />
            
            <div 
              onClick={(e) => menuUser.current?.toggle(e)}
              className="flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
            >
              <div className="flex flex-col items-end mr-1 text-right">
                <span className="text-[13px] font-semibold text-white/90 leading-none mb-1.5 truncate max-w-[150px]">
                  {userEmail}
                </span>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.15em] leading-none">
                  {role || (admin ? "ADMIN" : "CORRETOR")}
                </span>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-amber-500 font-bold text-lg shadow-inner group-hover:border-amber-500/30 transition-colors">
                {userInitial}
              </div>
              
              <ChevronDown size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      <UsuarioPerfilModal 
        visible={profileModalVisible} 
        onHide={() => setProfileModalVisible(false)} 
      />
    </div>
  );
}
