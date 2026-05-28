"use client";

import { ContratoCadastroForm } from "@/components/dashboard/ContratoCadastroForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canRegistrarContratoLegado } from "@/lib/auth-storage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ContratoLegadoPage() {
  const router = useRouter();

  useEffect(() => {
    if (!canRegistrarContratoLegado()) {
      router.replace("/dashboard/contratos");
    }
  }, [router]);

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
          Contrato legado / atípico
        </h1>
        <p className="text-white/50">
          Importe um contrato já assinado: o sistema regista-o diretamente como assinado, com o PDF na pasta padrão de contratos assinados.
        </p>
      </div>

      <ContratoCadastroForm mode="legado" />
    </main>
  );
}
