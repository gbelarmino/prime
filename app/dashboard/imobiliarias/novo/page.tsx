import { ImobiliariaForm } from "@/components/dashboard/ImobiliariaForm";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoImobiliariaPage() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-12">
        <Link 
          href="/dashboard/imobiliarias" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Voltar para listagem</span>
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-blue-600/10 flex items-center justify-center text-blue-400">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white font-[family-name:var(--font-playfair)] tracking-tight">Nova Imobiliária</h1>
            <p className="text-white/40 mt-1 font-medium">Cadastre uma nova parceira para começar a gerenciar contratos e corretores.</p>
          </div>
        </div>
      </header>

      <ImobiliariaForm mode="create" />
    </div>
  );
}
