"use client";

import { useSearchParams } from "next/navigation";
import { ImobiliariaForm } from "@/components/dashboard/ImobiliariaForm";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function ImobiliariaEditContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const entityId = idStr ? parseInt(idStr, 10) : undefined;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-12">
        <Link 
          href="/dashboard/imobiliarias" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cancelar Edição</span>
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-amber-600/10 flex items-center justify-center text-amber-400">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white font-[family-name:var(--font-playfair)] tracking-tight">Editar Imobiliária</h1>
            <p className="text-white/40 mt-1 font-medium">Atualize as informações cadastrais e fiscais da parceira.</p>
          </div>
        </div>
      </header>

      <ImobiliariaForm mode="edit" entityId={entityId} />
    </div>
  );
}

export default function EditImobiliariaPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40 font-bold uppercase tracking-[0.2em]">Sincronizando dados...</div>}>
      <ImobiliariaEditContent />
    </Suspense>
  );
}
