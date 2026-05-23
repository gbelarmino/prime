"use client";

import { useSearchParams } from "next/navigation";
import { UsuarioForm } from "@/components/dashboard/UsuarioForm";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function UsuarioEditContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const entityId = idStr ? parseInt(idStr, 10) : undefined;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-12">
        <Link 
          href="/dashboard/usuarios" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline mb-6 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cancelar Edição</span>
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-blue-600/10 flex items-center justify-center text-blue-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white font-[family-name:var(--font-playfair)] tracking-tight">Editar Usuário</h1>
            <p className="text-white/40 mt-1 font-medium">Modifique as permissões ou atualize os dados cadastrais da conta.</p>
          </div>
        </div>
      </header>

      <UsuarioForm mode="edit" entityId={entityId} />
    </div>
  );
}

export default function EditUsuarioPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40 font-bold uppercase tracking-[0.2em]">Carregando configurações...</div>}>
      <UsuarioEditContent />
    </Suspense>
  );
}
