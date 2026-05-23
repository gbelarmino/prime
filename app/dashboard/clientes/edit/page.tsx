"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClienteCadastroForm } from "@/components/dashboard/ClienteCadastroForm";
import { Suspense } from "react";

function EditClienteContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const clientId = idStr ? parseInt(idStr, 10) : undefined;

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl text-center">
          <p className="text-rose-200 font-bold">ID do cliente não fornecido ou inválido.</p>
          <Link href="/dashboard/clientes" className="text-blue-400 hover:underline mt-4 inline-block">
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <Link
          href="/dashboard/clientes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300 no-underline font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à lista
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">
          Atualização de Dados
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">Editar Cliente</h1>
        <p className="mt-2 text-white/40">
          Atualize as informações do contratante. Campos marcados com <span className="text-rose-400">*</span> são obrigatórios.
        </p>
      </div>

      <ClienteCadastroForm mode="edit" clientId={clientId} />
    </div>
  );
}

export default function EditarClientePage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <EditClienteContent />
    </Suspense>
  );
}
