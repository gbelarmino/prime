import type { Metadata } from "next";
import { Suspense } from "react";
import { SmsChatDesk } from "@/components/dashboard/atendimento/sms/SmsChatDesk";
import { pageTitle } from "@/lib/app-brand";

export const metadata: Metadata = {
  title: pageTitle("Chat SMS · Atendimento"),
  description: "Inbox SMS em tempo real para atendimento aos clientes.",
};

export default function AtendimentoSmsChatPage() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-end justify-between gap-3 px-4 pt-1">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400">
            Central de Atendimento
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-white">
            Chat SMS
          </h1>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-0 flex-1 items-center justify-center px-4">
            <span
              className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/65"
              aria-label="A carregar chat SMS"
            />
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <SmsChatDesk />
        </div>
      </Suspense>
    </div>
  );
}
