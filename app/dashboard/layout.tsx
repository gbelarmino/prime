"use client";

import { ReactNode, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { addLocale, locale } from "primereact/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Menu as MenuIcon,
  X,
  Search,
  Mail,
  LayoutGrid,
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
import { TwilioSaldoHeader } from "@/components/dashboard/TwilioSaldoHeader";
import { WhatsAppInboundAlertControl } from "@/components/dashboard/whatsapp/WhatsAppInboundAlertControl";
import {
  FIN_UNICRED_WEBHOOKS_PATH,
  useUnicredWebhookPendentes,
} from "@/hooks/use-unicred-webhook-pendentes";
import { useRealtimeSocketKeeper } from "@/hooks/use-realtime-socket-keeper";
import { useCrmFunilEnabled } from "@/hooks/use-crm-funil-enabled";
import {
  DASHBOARD_MENU_ITEMS,
  filterVisibleMenuChildren,
  menuChildVisible,
  menuItemVisible,
  type MenuChildDef,
  type MenuGroupItem,
} from "@/lib/dashboard-menu-items";
import {
  applyMenuPreference,
  buildMenuPreferenceFromItems,
  clearMenuPreference,
  loadMenuPreference,
  saveMenuPreference,
  type MenuPreference,
} from "@/lib/dashboard-menu-preferences";
import {
  DashboardMenuCustomizer,
  createDraftPreference,
} from "@/components/dashboard/DashboardMenuCustomizer";

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

  const visibleChildren = item.children.filter((c: MenuChildDef) => menuChildVisible(c, role));
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
                key={c.id}
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
  const [menuEditing, setMenuEditing] = useState(false);
  const [menuPreference, setMenuPreference] = useState<MenuPreference | null>(null);
  const [menuDraft, setMenuDraft] = useState<MenuPreference | null>(null);
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

  useEffect(() => {
    if (!mounted || !role || userEmail === "...") return;
    setMenuPreference(loadMenuPreference(userEmail, role));
  }, [mounted, role, userEmail]);

  const visibleMenuBase = useMemo(() => {
    return DASHBOARD_MENU_ITEMS.filter((item) => menuItemVisible(item, role, crmFunilEnabled)).map(
      (item) => (item.kind === "group" ? filterVisibleMenuChildren(item, role) : item),
    );
  }, [role, crmFunilEnabled]);

  const orderedMenuItems = useMemo(() => {
    const pref = menuEditing ? menuDraft : menuPreference;
    return applyMenuPreference(visibleMenuBase, pref);
  }, [visibleMenuBase, menuPreference, menuDraft, menuEditing]);

  const startMenuEditing = useCallback(() => {
    setExpanded(true);
    setPeeking(false);
    setMenuDraft(
      menuPreference ?? buildMenuPreferenceFromItems(visibleMenuBase),
    );
    setMenuEditing(true);
  }, [menuPreference, visibleMenuBase]);

  const saveMenuOrder = useCallback(() => {
    if (!role || userEmail === "..." || !menuDraft) return;
    saveMenuPreference(userEmail, role, menuDraft);
    setMenuPreference(menuDraft);
    setMenuEditing(false);
    toast.success("Ordem do menu salva.");
  }, [menuDraft, role, userEmail]);

  const cancelMenuEditing = useCallback(() => {
    setMenuDraft(null);
    setMenuEditing(false);
  }, []);

  const resetMenuOrder = useCallback(() => {
    if (!role || userEmail === "...") return;
    clearMenuPreference(userEmail, role);
    setMenuPreference(null);
    setMenuDraft(createDraftPreference(visibleMenuBase));
    toast.success("Menu restaurado ao padrão.");
  }, [role, userEmail, visibleMenuBase]);

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
          {menuEditing && menuDraft && (isSidebarOpen || mobileMenuOpen) ? (
            <DashboardMenuCustomizer
              items={visibleMenuBase}
              preference={menuDraft}
              onPreferenceChange={setMenuDraft}
              onSave={saveMenuOrder}
              onCancel={cancelMenuEditing}
              onReset={resetMenuOrder}
            />
          ) : (
            orderedMenuItems.map((item) =>
              item.kind === "link" ? (
                <div key={item.id} onClick={() => setMobileMenuOpen(false)}>
                  <SidebarItem
                    icon={<item.icon size={20} />}
                    label={item.label}
                    href={item.href}
                    expanded={isSidebarOpen || mobileMenuOpen}
                  />
                </div>
              ) : (
                <SidebarNavGroup
                  key={item.id}
                  item={item}
                  expanded={isSidebarOpen || mobileMenuOpen}
                  mobileMenuOpen={mobileMenuOpen}
                  pathname={pathname}
                  onNavigate={() => setMobileMenuOpen(false)}
                  role={role}
                  unicredWebhookPendentes={unicredWebhookPendentes}
                />
              ),
            )
          )}
        </nav>

        <div className="p-3 border-t border-white/5 flex flex-col gap-2">
          {(isSidebarOpen || mobileMenuOpen) && !menuEditing ? (
            <button
              type="button"
              onClick={startMenuEditing}
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all w-full text-left"
            >
              <LayoutGrid size={20} className="shrink-0" />
              <span className="font-medium animate-in fade-in duration-300">Organizar menu</span>
            </button>
          ) : null}
          {menuEditing && (isSidebarOpen || mobileMenuOpen) ? (
            <button
              type="button"
              onClick={cancelMenuEditing}
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-all w-full text-left text-sm"
            >
              <ChevronLeft size={18} className="shrink-0" />
              <span>Voltar ao menu</span>
            </button>
          ) : null}
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
            {(admin ||
              role === "ATENDIMENTO" ||
              role === "ADMINISTRATIVO") && (
              <>
                <TwilioSaldoHeader />
                <WhatsAppInboundAlertControl />
              </>
            )}
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
