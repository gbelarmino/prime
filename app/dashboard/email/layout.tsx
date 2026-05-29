"use client";

import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";

const SECTION_LABEL: Record<string, string> = {
  "/dashboard/email/conta": "Conta SMTP",
  "/dashboard/email/modelos": "Modelos de e-mail",
  "/dashboard/email/gatilhos": "Gatilhos automáticos",
  "/dashboard/email/teste": "Teste de envio",
  "/dashboard/email/teste-eventos": "Teste de eventos",
  "/dashboard/email/fila": "Fila de e-mails",
};

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = SECTION_LABEL[pathname] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2">
            Configurações de Comunicação
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)] flex items-center gap-4">
            <Mail className="text-sky-400" size={32} />
            E-mail
          </h1>
          {section ? (
            <p className="text-sm font-semibold text-sky-400/90 mt-2 tracking-tight">{section}</p>
          ) : null}
          <p className="text-white/40 mt-1 max-w-xl">
            Envio transaccional via SMTP (Titan / HostGator), independente do canal WhatsApp.
          </p>
        </div>
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
