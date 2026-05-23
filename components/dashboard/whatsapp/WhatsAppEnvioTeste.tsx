"use client";

import { useEffect, useState } from "react";
import { whatsappService, type WhatsAppLinha } from "@/lib/whatsapp-service";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

export function WhatsAppEnvioTeste() {
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [linhas, setLinhas] = useState<WhatsAppLinha[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = await whatsappService.listLinhas();
        setLinhas(list.filter((l) => l.ativo));
        const pad = list.find((l) => l.padrao && l.ativo);
        setAccountId((pad ?? list.find((l) => l.ativo))?.accountId ?? null);
      } catch {
        /* ignore — teste ainda pode usar linha padrão no backend */
      }
    })();
  }, []);

  const linhaOptions = linhas.map((l) => ({
    label: `${l.nome} (${l.accountId})`,
    value: l.accountId,
  }));

  const handleEnviar = async () => {
    const tel = telefone.trim();
    const msg = mensagem.trim();
    if (!tel || !msg) {
      toast.error("Preencha telefone e mensagem.");
      return;
    }

    setSending(true);
    try {
      const data = await whatsappService.sendTestMessage({
        telefone: tel,
        mensagem: msg,
        accountId: accountId ?? undefined,
      });
      toast.success(data.message ?? "Mensagem enviada.");
      setMensagem("");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Erro ao enviar.";
      toast.error(m);
    } finally {
      setSending(false);
    }
  };

  return (
    <WhatsAppSectionShell
      eyebrow="Ferramenta"
      title="Teste de envio"
      description="Envia texto para um número em E.164. Brasil: 5585999645200 ou 85996452000. EUA/Canadá: +19842818965 ou 19842818965 (não use 55 antes do 1)."
    >
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        {linhaOptions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="wa-teste-linha" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Linha de envio
            </label>
            <Dropdown
              inputId="wa-teste-linha"
              value={accountId}
              options={linhaOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setAccountId(e.value)}
              disabled={sending}
              className="w-full border-white/10 bg-white/[0.05] text-white"
              pt={{
                root: {
                  className:
                    "flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.05] text-white",
                },
                input: { className: "text-sm text-white/90" },
                panel: { className: "border border-white/10 bg-[#071C33]" },
                item: { className: "text-sm text-white/75 hover:bg-white/[0.06]" },
              }}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <label htmlFor="wa-teste-telefone" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Telefone
          </label>
          <InputText
            id="wa-teste-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
            placeholder="Ex.: 85996452000 (11 dígitos com DDD) ou 5585996452000"
            autoComplete="tel"
            disabled={sending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="wa-teste-mensagem" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Mensagem
          </label>
          <InputTextarea
            id="wa-teste-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={5}
            className="border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
            placeholder="Texto a enviar…"
            disabled={sending}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            label="Enviar"
            icon="pi pi-send"
            onClick={() => void handleEnviar()}
            disabled={sending}
            loading={sending}
            className="rounded-xl border-0 bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500"
          />
        </div>
      </div>
    </WhatsAppSectionShell>
  );
}
