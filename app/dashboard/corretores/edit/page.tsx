"use client";

import { useSearchParams } from "next/navigation";
import { CorretorForm } from "@/components/dashboard/CorretorForm";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function CorretorEditContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const entityId = idStr ? parseInt(idStr, 10) : undefined;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-12">
        <Link 
          href="/dashboard/corretores" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cancelar Edição</span>
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-600/10 flex items-center justify-center text-emerald-400">
            <User size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white font-[family-name:var(--font-playfair)] tracking-tight">Editar Corretor</h1>
            <p className="text-white/40 mt-1 font-medium">Atualize as informações cadastrais e o vínculo imobiliário do profissional.</p>
          </div>
        </div>
      </header>

      <CorretorForm mode="edit" entityId={entityId} />
    </div>
  );
}

export default function EditCorretorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40 font-bold uppercase tracking-[0.2em]">Carregando perfil...</div>}>
      <CorretorEditContent />
    </Suspense>
  );
}
