import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { OpenClawChat } from "@/components/dashboard/OpenClawChat";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("OpenClaw"),
  description: "Chat com o agente OpenClaw do Aires.",
};

export default function DashboardOpenClawPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col px-4">
        <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
          <Bot size={14} />
          Agente
        </div>
        <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          OpenClaw
        </h1>
        <p className="mt-1 max-w-2xl font-medium leading-relaxed text-white/40">
          Chat com o agente desta VPS, na sessão do Aires. A conversa fica no gateway e é
          recarregada ao abrir a página. Só administradores têm acesso.
        </p>
      </div>
      <OpenClawChat />
    </div>
  );
}
