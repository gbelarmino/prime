import type { Metadata } from "next";
import { AuditoriaList } from "@/components/dashboard/AuditoriaList";
import { ScrollText } from "lucide-react";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Auditoria"),
  description: "Log de atividades dos utilizadores no painel.",
};

export default function DashboardAuditoriaPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col px-4">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400 mb-2">
          <ScrollText size={14} />
          Segurança e conformidade
        </div>
        <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
          Auditoria
        </h1>
        <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
          Histórico de ações relevantes no sistema (criação, edição, cancelamento e operações
          financeiras). Apenas administradores têm acesso. Leituras e consultas não são
          registadas.
        </p>
      </div>

      <div className="px-4 pb-12">
        <AuditoriaList />
      </div>
    </div>
  );
}
