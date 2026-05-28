"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const SECTION_LABEL: Record<string, string> = {
  "/dashboard/whatsapp/conexao": "Conexão",
  "/dashboard/whatsapp/modelos": "Modelos de mensagem",
  "/dashboard/whatsapp/gatilhos": "Gatilhos automáticos",
  "/dashboard/whatsapp/teste": "Teste de envio",
  "/dashboard/whatsapp/teste-eventos": "Teste de eventos",
  "/dashboard/whatsapp/fila": "Fila de mensagens",
};

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
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
            <MessageCircle className="text-emerald-500" size={32} />
            WhatsApp
          </h1>
          {section ? (
            <p className="text-sm font-semibold text-emerald-400/90 mt-2 tracking-tight">{section}</p>
          ) : null}
          <p className="text-white/40 mt-1 max-w-xl">
            Automação de mensagens (contratos, notificações) com a mesma identidade visual do painel DOMUS.
          </p>
        </div>
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
