import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClienteCadastroForm } from "@/components/dashboard/ClienteCadastroForm";

export const metadata: Metadata = {
  title: "Novo Cliente | Aires Prime",
  description: "Cadastro de contratante.",
};

export default function NovoClientePage() {
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
          Fluxo de Cadastro
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">Novo Cliente</h1>
        <p className="mt-2 text-white/40">
          Preencha os dados do contratante. Campos marcados com <span className="text-rose-400">*</span> são obrigatórios.
        </p>
      </div>

      <ClienteCadastroForm mode="create" />
    </div>
  );
}
