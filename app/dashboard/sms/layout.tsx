"use client";

import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

const SECTION_LABEL: Record<string, string> = {
  "/dashboard/sms/conta": "Conta TextBee",
  "/dashboard/sms/modelos": "Modelos de SMS",
  "/dashboard/sms/gatilhos": "Gatilhos automáticos",
  "/dashboard/sms/teste": "Teste de envio",
  "/dashboard/sms/teste-eventos": "Teste de eventos",
  "/dashboard/sms/fila": "Fila de SMS",
};

export default function SmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = SECTION_LABEL[pathname] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400 mb-2">
            Configurações de Comunicação
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)] flex items-center gap-4">
            <MessageSquare className="text-violet-400" size={32} />
            SMS
          </h1>
          {section ? (
            <p className="text-sm font-semibold text-violet-400/90 mt-2 tracking-tight">{section}</p>
          ) : null}
          <p className="text-white/40 mt-1 max-w-xl">
            Envio transaccional via TextBee, independente dos canais WhatsApp e e-mail.
          </p>
        </div>
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
