"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Panel } from "primereact/panel";
import { isAdmin as isAuthAdmin, getDefaultDashboardPath } from "@/lib/auth-storage";
import Link from "next/link";
import { DashboardTimeline } from "@/components/dashboard/DashboardTimeline";
import { DashboardStatsCarouselGrid } from "@/components/dashboard/DashboardStatsCarouselGrid";

export default function DashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const isAdminUser = isAuthAdmin();
    setAdmin(isAdminUser);
    if (!isAdminUser) {
      router.replace(getDefaultDashboardPath());
    }
  }, [router]);

  if (!mounted || !admin) return null;

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-[1200px] mx-auto">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Painel de Controle • {admin ? "Administrador" : "Corretor"}
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">Aires Command Center</h1>
          <p className="text-white/40 mt-1">Gestão estratégica e inteligência de vendas em tempo real.</p>
        </div>
        <div className="flex gap-3">
          {admin && (
            <Link href="/dashboard/imoveis/novo">
              <Button label="Novo Imóvel" icon="pi pi-plus" className="p-button-outlined p-button-sm" />
            </Link>
          )}
          <Link href="/dashboard/contratos/novo">
            <Button label="Novo Contrato" icon="pi pi-file-pdf" className="p-button-sm bg-blue-600 border-none" />
          </Link>
        </div>
      </header>

      {/* Grid de Stats dentro de um Painel Recolhível */}
      <Panel 
        header="Estatísticas de Performance" 
        toggleable 
        className="custom-dashboard-panel"
        pt={{
          root: { className: 'border-none bg-transparent' },
          header: { className: 'bg-white/5 border border-white/10 rounded-t-[1.5rem] p-4 text-white font-bold uppercase tracking-widest text-xs' },
          content: { className: 'bg-white/[0.02] border-x border-b border-white/10 rounded-b-[1.5rem] p-6' },
          toggler: { className: 'text-white/50 hover:text-white hover:bg-white/10 transition-all' }
        }}
      >
        <DashboardStatsCarouselGrid />
      </Panel>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Atividades e Alertas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          <section className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" /> Alertas Críticos
            </h3>
            <div className="flex flex-col gap-3">
              <Message severity="warn" content={(
                <div className="flex flex-col ml-2">
                  <span className="font-bold">3 reservas expiram em 24h</span>
                  <span className="text-xs opacity-80">Lotes: Q2-L14, Q5-L02, Q8-L10</span>
                </div>
              )} className="w-full justify-start border-amber-500/20 bg-amber-500/5 text-amber-200" />
              
              <Message severity="error" content={(
                <div className="flex flex-col ml-2">
                  <span className="font-bold">2 contratos pendentes de documento</span>
                  <span className="text-xs opacity-80">Ação necessária para prosseguir com assinatura.</span>
                </div>
              )} className="w-full justify-start border-rose-500/20 bg-rose-500/5 text-rose-200" />
            </div>
          </section>

          <DashboardTimeline />
        </div>

        <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-white">Funil comercial</h3>
          <Message
            severity="info"
            className="w-full border-white/10 bg-white/5 text-white/80"
            text="Indicadores de leads e conversão entram na Fase 2 (CRM). Use o carrossel acima e a linha do tempo para a operação atual."
          />
        </section>

      </div>
    </div>
  );
}
