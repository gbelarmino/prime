import type { Metadata } from "next";
import { Suspense } from "react";
import { AtendimentoChatDesk } from "@/components/dashboard/atendimento/AtendimentoChatDesk";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Chat · Atendimento"),
  description: "Inbox WhatsApp em tempo real para atendimento aos clientes.",
};

export default function AtendimentoChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
          Central de Atendimento
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
          Chat WhatsApp
        </h1>
        <p className="mt-1 max-w-2xl text-white/40">
          Receba e responda mensagens dos clientes em tempo real via Twilio.
        </p>
      </div>
      <Suspense fallback={<div className="px-4 text-sm text-white/40">Carregando chat…</div>}>
        <AtendimentoChatDesk />
      </Suspense>
    </div>
  );
}
