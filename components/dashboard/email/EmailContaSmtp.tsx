"use client";

import { useEffect, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { Mail, RefreshCw, Send } from "lucide-react";
import {
  emailService,
  TITAN_SMTP_PRESET,
  type EmailSmtpConfig,
} from "@/lib/email-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

const CRIPTO_OPTIONS = [
  { label: "SSL (porta 465)", value: "SSL" },
  { label: "STARTTLS (porta 587)", value: "STARTTLS" },
];

export function EmailContaSmtp() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDestino, setTestDestino] = useState("");
  const [form, setForm] = useState({
    nomeRemetente: "",
    emailRemetente: "",
    usuarioSmtp: "",
    senhaSmtp: "",
    hostSmtp: TITAN_SMTP_PRESET.hostSmtp,
    portaSmtp: TITAN_SMTP_PRESET.portaSmtp,
    tipoCriptografia: TITAN_SMTP_PRESET.tipoCriptografia,
    provedor: TITAN_SMTP_PRESET.provedor,
    replyTo: "",
    ativo: true,
  });
  const [meta, setMeta] = useState<Pick<EmailSmtpConfig, "senhaConfigurada" | "ultimoTesteEm" | "ultimoTesteOk">>({});

  const load = async () => {
    setLoading(true);
    try {
      const cfg = await emailService.getSmtpConfig();
      if (cfg) {
        setForm({
          nomeRemetente: cfg.nomeRemetente ?? "",
          emailRemetente: cfg.emailRemetente ?? "",
          usuarioSmtp: cfg.usuarioSmtp ?? "",
          senhaSmtp: "",
          hostSmtp: cfg.hostSmtp ?? TITAN_SMTP_PRESET.hostSmtp,
          portaSmtp: cfg.portaSmtp ?? 465,
          tipoCriptografia: cfg.tipoCriptografia ?? "SSL",
          provedor: cfg.provedor ?? "TITAN",
          replyTo: cfg.replyTo ?? "",
          ativo: cfg.ativo ?? true,
        });
        setMeta({
          senhaConfigurada: cfg.senhaConfigurada,
          ultimoTesteEm: cfg.ultimoTesteEm,
          ultimoTesteOk: cfg.ultimoTesteOk,
        });
      }
    } catch {
      toast.error("Erro ao carregar conta SMTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await emailService.saveSmtpConfig({
        ...form,
        ativo: form.ativo ? "S" : "N",
        senhaSmtp: form.senhaSmtp.trim() || undefined,
        replyTo: form.replyTo.trim() || null,
      });
      setMeta({
        senhaConfigurada: saved.senhaConfigurada,
        ultimoTesteEm: saved.ultimoTesteEm,
        ultimoTesteOk: saved.ultimoTesteOk,
      });
      setForm((f) => ({ ...f, senhaSmtp: "" }));
      toast.success("Conta SMTP guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleTeste = async () => {
    const dest = testDestino.trim();
    if (!dest) {
      toast.error("Indique o e-mail de destino do teste");
      return;
    }
    if (!form.nomeRemetente.trim() || !form.emailRemetente.trim() || !form.usuarioSmtp.trim() || !form.hostSmtp.trim()) {
      toast.error("Preencha nome, e-mail e utilizador SMTP antes do teste");
      return;
    }
    if (!meta.senhaConfigurada && !form.senhaSmtp.trim()) {
      toast.error("Indique a senha SMTP na primeira configuração");
      return;
    }
    setTesting(true);
    try {
      await emailService.saveSmtpConfig({
        ...form,
        ativo: form.ativo ? "S" : "N",
        senhaSmtp: form.senhaSmtp.trim() || undefined,
        replyTo: form.replyTo.trim() || null,
      });
      await emailService.testeSmtp(dest);
      toast.success("E-mail de teste enviado");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Teste falhou");
    } finally {
      setTesting(false);
    }
  };

  return (
    <WhatsAppSectionShell
      eyebrow="Integrações"
      title="Conta SMTP"
      description="Uma conta por tenant (ex.: Titan / HostGator). A senha fica cifrada no servidor; deixe em branco para manter a actual."
      actions={
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/15 hover:bg-white/[0.07] disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      }
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {meta.ultimoTesteEm ? (
          <p className="text-sm text-white/50">
            Último teste: {new Date(meta.ultimoTesteEm).toLocaleString("pt-BR")}
            {meta.ultimoTesteOk === true ? " — OK" : meta.ultimoTesteOk === false ? " — falhou" : ""}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Nome remetente</label>
            <InputText value={form.nomeRemetente} onChange={(e) => setForm({ ...form, nomeRemetente: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">E-mail remetente</label>
            <InputText value={form.emailRemetente} onChange={(e) => setForm({ ...form, emailRemetente: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Utilizador SMTP</label>
            <InputText value={form.usuarioSmtp} onChange={(e) => setForm({ ...form, usuarioSmtp: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Senha SMTP {meta.senhaConfigurada ? "(deixe vazio para manter)" : ""}
            </label>
            <InputText type="password" value={form.senhaSmtp} onChange={(e) => setForm({ ...form, senhaSmtp: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Host</label>
            <InputText value={form.hostSmtp} onChange={(e) => setForm({ ...form, hostSmtp: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Porta</label>
            <InputText
              keyfilter="int"
              value={String(form.portaSmtp)}
              onChange={(e) => setForm({ ...form, portaSmtp: Number(e.target.value) || 465 })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Criptografia</label>
            <Dropdown
              value={form.tipoCriptografia}
              options={CRIPTO_OPTIONS}
              onChange={(e) => setForm({ ...form, tipoCriptografia: e.value as string })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Reply-To (opcional)</label>
            <InputText value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <InputSwitch checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.value ?? false })} />
            <span className="text-sm text-white/70">Conta activa para envios automáticos</span>
          </div>
        </div>

        <Button label="Guardar configuração" icon={<Mail className="h-4 w-4" />} loading={saving} onClick={() => void handleSave()} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm text-white/50">
            Guarda automaticamente a configuração acima antes de enviar.
          </p>
          <p className="mb-3 text-sm font-semibold text-white/80">Teste de conectividade</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <InputText
              placeholder="destino@exemplo.com"
              value={testDestino}
              onChange={(e) => setTestDestino(e.target.value)}
              className="flex-1"
            />
            <Button label="Enviar teste" icon={<Send className="h-4 w-4" />} loading={testing} onClick={() => void handleTeste()} />
          </div>
        </div>
      </div>
    </WhatsAppSectionShell>
  );
}
