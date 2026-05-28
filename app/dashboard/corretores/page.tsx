import type { Metadata } from "next";
import Link from "next/link";
import { CorretoresList } from "@/components/dashboard/CorretoresList";
import { Button } from "primereact/button";
import { Plus, Users } from "lucide-react";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Corretores"),
  description: "Gerenciamento de corretores cadastrados.",
};

export default function DashboardCorretoresPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400 mb-2">
            Equipe de Vendas
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
            Corretores
          </h1>
          <p className="text-white/40 mt-1 max-w-lg leading-relaxed font-medium">
            Gerencie os corretores vinculados, suas inscrições no CRECI e associações com imobiliárias parceiras.
          </p>
        </div>

        <Link href="/dashboard/corretores/novo" className="no-underline">
          <Button className="bg-emerald-600 hover:bg-emerald-500 border-none rounded-full px-8 py-4 flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-emerald-600/30 group">
            <span className="text-sm font-black text-white uppercase tracking-widest">NOVO</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <Plus size={18} className="text-white" />
            </div>
          </Button>
        </Link>
      </div>

      {/* List Section */}
      <div className="px-4 pb-12">
        <CorretoresList />
      </div>
    </div>
  );
}
