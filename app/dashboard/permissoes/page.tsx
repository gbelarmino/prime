import type { Metadata } from "next";
import { PermissoesMatriz } from "@/components/dashboard/PermissoesMatriz";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Permissões"),
  description: "Matriz de menus e ações por perfil de acesso.",
};

export default function DashboardPermissoesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400 mb-2">
          Administração de Sistema
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Permissões
        </h1>
        <p className="mt-1 max-w-2xl font-medium leading-relaxed text-white/40">
          Defina o que cada perfil vê no menu e quais ações pode executar no painel. Alterações
          aplicam-se após salvar; o Admin mantém acesso completo.
        </p>
      </div>

      <div className="px-4 pb-12">
        <PermissoesMatriz />
      </div>
    </div>
  );
}
