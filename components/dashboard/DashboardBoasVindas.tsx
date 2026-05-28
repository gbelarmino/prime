"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Contact,
  FileText,
  MapPin,
  UserSquare,
  Headset,
  ArrowRight,
} from "lucide-react";
import { getUserEmail, getUserRole } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { APP_BRAND_NAME } from "@/lib/app-brand";

type QuickLink = {
  href: string;
  label: string;
  description: string;
  icon: typeof Contact;
};

const ROLE_LABELS: Record<string, string> = {
  CORRETOR: "Corretor",
  IMOBILIARIA: "Imobiliária",
  ATENDIMENTO: "Atendimento",
};

function quickLinksForRole(role: string | null): QuickLink[] {
  if (role === "IMOBILIARIA") {
    return [
      {
        href: "/dashboard/corretores",
        label: "Corretores",
        description: "Equipe e inscrições CRECI",
        icon: UserSquare,
      },
      {
        href: "/dashboard/imoveis",
        label: "Imóveis",
        description: "Carteira e disponibilidade",
        icon: MapPin,
      },
      {
        href: "/dashboard/contratos",
        label: "Contratos",
        description: "Honorários e assinaturas",
        icon: FileText,
      },
      {
        href: "/dashboard/clientes",
        label: "Clientes",
        description: "Cadastro e consulta",
        icon: Contact,
      },
    ];
  }
  if (role === "ATENDIMENTO") {
    return [
      {
        href: "/dashboard/atendimento",
        label: "Atendimento",
        description: "Consulta de contratos e cobrança",
        icon: Headset,
      },
    ];
  }
  return [
    {
      href: "/dashboard/clientes",
      label: "Clientes",
      description: "Cadastro e consulta",
      icon: Contact,
    },
    {
      href: "/dashboard/imoveis",
      label: "Imóveis",
      description: "Carteira e disponibilidade",
      icon: MapPin,
    },
    {
      href: "/dashboard/contratos",
      label: "Contratos",
      description: "Honorários e assinaturas",
      icon: FileText,
    },
  ];
}

export function DashboardBoasVindas() {
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUserRole());
    setEmail(getUserEmail());
  }, []);

  const roleLabel = (role && ROLE_LABELS[role]) || "Colaborador";
  const links = quickLinksForRole(role);

  return (
    <div className="flex flex-col gap-10 p-4 md:p-8 max-w-[900px] mx-auto">
      <header className="px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2">
          {APP_BRAND_NAME}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-playfair)]">
          Bem-vindo
        </h1>
        <p className="text-white/50 mt-2 font-medium">
          {email ? (
            <>
              Olá, <span className="text-white/80">{email}</span>
            </>
          ) : (
            "Acesso ao painel"
          )}{" "}
          — perfil <span className="text-white/80">{roleLabel}</span>.
        </p>
        <p className="text-sm text-white/35 mt-4 leading-relaxed max-w-xl">
          Use o menu lateral para navegar pelos módulos disponíveis para o seu perfil.
          O painel de controle com indicadores estratégicos é exclusivo do administrador.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col gap-3 p-6 rounded-[1.5rem] no-underline",
                "bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/[0.07] transition-all",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <Icon size={20} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-white/20 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                />
              </div>
              <div>
                <span className="text-sm font-bold text-white">{item.label}</span>
                <p className="text-xs text-white/40 mt-1">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
