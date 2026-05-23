"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TituloDetalhe } from "@/components/dashboard/fin/TituloDetalhe";

function TituloDetalheContent() {
  const id = useSearchParams().get("id")?.trim();

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Título não informado
          </p>
          <p className="mb-6 text-sm text-white/40">Abra o detalhe a partir da lista de títulos.</p>
          <Link
            href="/dashboard/financeiro/titulos"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  return <TituloDetalhe tituloId={id} />;
}

export default function TituloDetalhePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm font-medium text-white/30 animate-pulse">
          Carregando título…
        </div>
      }
    >
      <TituloDetalheContent />
    </Suspense>
  );
}
