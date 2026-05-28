"use client";

import { Suspense } from "react";
import { FileText, Plus, Archive } from "lucide-react";
import Link from "next/link";
import { Button } from "primereact/button";
import { ContratosList } from "@/components/dashboard/ContratosList";
import {
  canRegistrarContratoLegado,
  isAdministrativo,
  isAdmin as isAuthAdmin,
  isCorretor,
  isImobiliaria,
} from "@/lib/auth-storage";

export default function ContratosPage() {
  const canRegistrarLegado = canRegistrarContratoLegado();
  const canCreateContrato =
    !isAdministrativo() && (isAuthAdmin() || isCorretor() || isImobiliaria());

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
            Gestão de Contratos
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
            Contratos
          </h1>
          <p className="text-white/40 mt-1 max-w-xl leading-relaxed font-medium">
            Gerencie propostas, acompanhe o fluxo de aprovação e visualize o histórico completo de auditoria dos contratos.
          </p>
        </div>

        {(canCreateContrato || canRegistrarLegado) && (
          <div className="flex flex-wrap items-center gap-3">
            {canRegistrarLegado && (
              <Link href="/dashboard/contratos/legado" className="no-underline">
                <Button className="bg-emerald-600 hover:bg-emerald-500 border-none rounded-full px-8 py-4 flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-emerald-600/30 group">
                  <span className="text-sm font-black text-white uppercase tracking-widest">LEGADO</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Archive size={18} className="text-white" />
                  </div>
                </Button>
              </Link>
            )}
            {canCreateContrato && (
            <Link href="/dashboard/contratos/novo" className="no-underline">
              <Button className="bg-blue-600 hover:bg-blue-500 border-none rounded-full px-8 py-4 flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-blue-600/30 group">
                <span className="text-sm font-black text-white uppercase tracking-widest">NOVO</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                  <Plus size={18} className="text-white" />
                </div>
              </Button>
            </Link>
            )}
          </div>
        )}
      </div>

      {/* Listagem */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <Suspense fallback={<div className="p-12 text-center text-white/20 font-medium animate-pulse">Carregando lista de contratos...</div>}>
          <ContratosList />
        </Suspense>
      </div>
    </div>
  );
}
