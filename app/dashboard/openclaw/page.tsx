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
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col">
        <div className="mb-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
          <Bot size={14} />
          Agente
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white sm:text-4xl">
          OpenClaw
        </h1>
        <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-white/40">
          Chat com o agente desta VPS, na sessão do Aires. A conversa fica no gateway e é
          recarregada ao abrir a página. Acesso dos perfis Admin e Administrativo.
        </p>
      </div>
      <OpenClawChat />
    </div>
  );
}
