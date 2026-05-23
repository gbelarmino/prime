"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ImoveisList } from "@/components/dashboard/ImoveisList";
import { Button } from "primereact/button";
import { Plus } from "lucide-react";
import { isAdmin as isAuthAdmin } from "@/lib/auth-storage";

export default function DashboardImoveisPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAdmin(isAuthAdmin());
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2">
            Gestão de Patrimônio
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">Imóveis</h1>
          <p className="text-white/40 mt-1">Visualize e gerencie o estoque de lotes e unidades disponíveis.</p>
        </div>
        
        {isAdmin && (
          <Link href="/dashboard/imoveis/novo" className="no-underline">
            <Button className="bg-blue-600 hover:bg-blue-500 border-none rounded-full px-8 py-4 flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-blue-600/30 group">
              <span className="text-sm font-black text-white uppercase tracking-widest">NOVO</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus size={18} className="text-white" />
              </div>
            </Button>
          </Link>
        )}
      </div>

      <ImoveisList />
    </div>
  );
}
