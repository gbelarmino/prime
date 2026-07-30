"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChamadosList } from "@/components/dashboard/ChamadosList";
import { canAccessChamados } from "@/lib/auth-storage";

export default function ChamadosPage() {
  const router = useRouter();

  useEffect(() => {
    if (!canAccessChamados()) {
      router.replace("/dashboard/atendimento");
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-8">
      <div className="px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400">
          Atendimento
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Chamados
        </h1>
        <p className="mt-1 max-w-2xl text-white/40">
          Inbox de solicitações abertas pelo portal do cliente — respostas públicas e notas internas.
        </p>
      </div>
      <div className="px-4 pb-8">
        <ChamadosList />
      </div>
    </div>
  );
}
