"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContratoCadastroForm } from "@/components/dashboard/ContratoCadastroForm";
import { Suspense } from "react";

function EditContratoContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const router = useRouter();
  
  // Redirecionar para tela de novo contrato se o ID for "novo" ou "novo.txt"
  const idLower = idStr?.toLowerCase();
  if (idLower === "novo" || idLower === "novo.txt") {
    router.replace("/dashboard/contratos/novo");
    return null;
  }

  const contratoId = idStr ? parseInt(idStr, 10) : undefined;

  if (!contratoId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl text-center">
          <p className="text-rose-200 font-bold">ID do contrato não fornecido ou inválido.</p>
          <Link href="/dashboard/contratos" className="text-blue-400 hover:underline mt-4 inline-block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 px-4">
        <Link
          href="/dashboard/contratos"
          className="mb-6 inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300 no-underline font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à lista
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2">
          Gestão de Contratos
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">Editar Contrato</h1>
        <p className="mt-2 text-white/40">
          Atualize os termos e condições do contrato de honorários.
        </p>
      </div>

      <ContratoCadastroForm mode="edit" entityId={contratoId} />
    </div>
  );
}

export default function EditarContratoPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <EditContratoContent />
    </Suspense>
  );
}
