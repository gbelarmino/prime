"use client";

import { useSearchParams } from "next/navigation";
import { ImovelCadastroForm } from "@/components/dashboard/ImovelCadastroForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function ImovelEditContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const entityId = idStr ? parseInt(idStr, 10) : undefined;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8">
        <Link 
          href="/dashboard/imoveis" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors no-underline mb-4 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar para listagem</span>
        </Link>
        <h1 className="text-4xl font-bold text-white font-[family-name:var(--font-playfair)]">Editar Imóvel</h1>
        <p className="text-white/40 mt-2">Atualize as informações técnicas ou a situação desta unidade.</p>
      </header>

      <ImovelCadastroForm mode="edit" entityId={entityId} />
    </div>
  );
}

export default function EditImovelPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/40">Carregando formulário...</div>}>
      <ImovelEditContent />
    </Suspense>
  );
}
