"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TituloDetalhe } from "@/components/dashboard/fin/TituloDetalhe";

function TituloDetalheAtendimentoContent() {
  const tituloId = useSearchParams().get("id")?.trim();
  const rawContrato = useSearchParams().get("contratoId")?.trim();
  const contratoId = rawContrato ? Number(rawContrato) : NaN;

  if (!tituloId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Título não informado
          </p>
          <p className="mb-6 text-sm text-white/40">Abra o detalhe a partir do painel de atendimento.</p>
          <Link
            href="/dashboard/atendimento"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            Voltar à consulta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TituloDetalhe
      tituloId={tituloId}
      variant="atendimento"
      contratoId={Number.isNaN(contratoId) ? undefined : contratoId}
    />
  );
}

export default function TituloDetalheAtendimentoPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm font-medium text-white/30 animate-pulse">
          Carregando título…
        </div>
      }
    >
      <TituloDetalheAtendimentoContent />
    </Suspense>
  );
}
