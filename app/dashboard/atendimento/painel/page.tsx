"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AtendimentoPainel } from "@/components/dashboard/atendimento/AtendimentoPainel";

function PainelContent() {
  const raw = useSearchParams().get("id")?.trim();
  const contratoId = raw ? Number(raw) : NaN;

  if (!raw || Number.isNaN(contratoId)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Contrato não informado
          </p>
          <p className="mb-6 text-sm text-white/40">Abra o painel a partir da consulta de contratos.</p>
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

  return <AtendimentoPainel contratoId={contratoId} />;
}

export default function AtendimentoPainelPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse px-4 py-16 text-center text-sm font-medium text-white/30">
          Carregando painel…
        </div>
      }
    >
      <PainelContent />
    </Suspense>
  );
}
