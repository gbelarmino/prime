"use client";

import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { emailService } from "@/lib/email-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

export function EmailEnvioTeste() {
  const [destino, setDestino] = useState("");
  const [assunto, setAssunto] = useState("Teste Aires");
  const [corpo, setCorpo] = useState("<p>Mensagem de teste do painel Aires.</p>");
  const [sending, setSending] = useState(false);

  const handleEnviar = async () => {
    if (!destino.trim() || !assunto.trim() || !corpo.trim()) {
      toast.error("Preencha destino, assunto e corpo.");
      return;
    }
    setSending(true);
    try {
      await emailService.sendTestMessage({
        destino: destino.trim(),
        assunto: assunto.trim(),
        corpo: corpo.trim(),
      });
      toast.success("E-mail enviado");
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
      description="Envia um e-mail HTML usando a conta SMTP configurada neste tenant."
    >
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <InputText placeholder="destino@exemplo.com" value={destino} onChange={(e) => setDestino(e.target.value)} />
        <InputText placeholder="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        <InputTextarea rows={8} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        <Button label="Enviar" icon={<Send className="h-4 w-4" />} loading={sending} onClick={() => void handleEnviar()} />
      </div>
    </WhatsAppSectionShell>
  );
}
