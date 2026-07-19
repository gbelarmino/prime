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
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3 px-4 pt-1">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
            Central de Atendimento
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-white">
            Chat WhatsApp
          </h1>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-5.5rem)] items-center justify-center px-4">
            <span
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/65"
              aria-label="A carregar chat"
            />
          </div>
        }
      >
        <AtendimentoChatDesk />
      </Suspense>
    </div>
  );
}
