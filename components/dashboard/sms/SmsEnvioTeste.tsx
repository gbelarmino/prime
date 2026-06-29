"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { smsService } from "@/lib/sms-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import { cn } from "@/lib/utils";

const SMS_CHAR_LIMIT = 160;

export function SmsEnvioTeste() {
  const [destino, setDestino] = useState("");
  const [corpo, setCorpo] = useState("Mensagem de teste do painel Aires.");
  const [sending, setSending] = useState(false);

  const charCount = corpo.length;
  const overLimit = charCount > SMS_CHAR_LIMIT;

  const handleEnviar = async () => {
    if (!destino.trim() || !corpo.trim()) {
      toast.error("Preencha destino e mensagem.");
      return;
    }
    setSending(true);
    try {
      await smsService.sendTestMessage({
        destino: destino.trim(),
        corpo: corpo.trim(),
      });
      toast.success("SMS enviado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <WhatsAppSectionShell
      eyebrow="Ferramenta"
      title="Teste de envio"
      description="Envia um SMS usando a conta TextBee configurada neste tenant."
    >
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <InputText placeholder="+5511999999999" value={destino} onChange={(e) => setDestino(e.target.value)} />
        <InputTextarea rows={5} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        <p className={cn("text-[11px]", overLimit ? "text-amber-300/90" : "text-white/45")}>
          {charCount} / {SMS_CHAR_LIMIT} caracteres
          {overLimit ? " — mensagem pode ser dividida em vários SMS" : ""}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={sending}
            onClick={() => void handleEnviar()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "A enviar…" : "Enviar"}
          </button>
        </div>
      </div>
    </WhatsAppSectionShell>
  );
}
