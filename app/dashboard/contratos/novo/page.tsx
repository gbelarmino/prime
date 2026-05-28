import { ContratoCadastroForm } from "@/components/dashboard/ContratoCadastroForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pageTitle } from "@/lib/app-brand";

export const metadata = {
  title: pageTitle("Novo Contrato"),
};

export default function NovoContratoPage() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/contratos"
          className="mb-6 inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300 no-underline font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à lista
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2 font-[family-name:var(--font-playfair)]">
          Novo Contrato
        </h1>
        <p className="text-white/50">
          Preencha os dados abaixo para gerar um novo contrato no sistema.
        </p>
      </div>

      <ContratoCadastroForm mode="create" />
    </main>
  );
}
