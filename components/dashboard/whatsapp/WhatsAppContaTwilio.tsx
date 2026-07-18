"use client";

import { useEffect, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import {
  whatsappService,
  type WhatsAppTwilioConfig,
} from "@/lib/whatsapp-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

const DEFAULT_TEST_MESSAGE = "Teste WhatsApp Twilio — Aires";

export function WhatsAppContaTwilio() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDestino, setTestDestino] = useState("");
  const [testMensagem, setTestMensagem] = useState(DEFAULT_TEST_MESSAGE);
  const [form, setForm] = useState({
    accountSid: "",
    authToken: "",
    whatsappFrom: "",
    wabaId: "",
    ativo: true,
  });
  const [meta, setMeta] = useState<
    Pick<WhatsAppTwilioConfig, "authTokenConfigured" | "ultimoTesteEm" | "ultimoTesteOk">
  >({ authTokenConfigured: false });

  const load = async () => {
    setLoading(true);
    try {
      const cfg = await whatsappService.getTwilioConfig();
      if (cfg) {
        setForm({
          accountSid: cfg.accountSid ?? "",
          authToken: "",
          whatsappFrom: cfg.whatsappFrom ?? "",
          wabaId: cfg.wabaId ?? "",
          ativo: cfg.ativo !== "N",
        });
        setMeta({
          authTokenConfigured: cfg.authTokenConfigured,
          ultimoTesteEm: cfg.ultimoTesteEm,
          ultimoTesteOk: cfg.ultimoTesteOk,
        });
      }
    } catch {
      toast.error("Erro ao carregar configuração Twilio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    if (!form.accountSid.trim()) {
      toast.error("Account SID é obrigatório");
      return;
    }
    if (!form.whatsappFrom.trim()) {
      toast.error("Número WhatsApp (From) é obrigatório");
      return;
    }
    if (!meta.authTokenConfigured && !form.authToken.trim()) {
      toast.error("Auth Token é obrigatório na primeira configuração");
      return;
    }
    setSaving(true);
    try {
      const saved = await whatsappService.saveTwilioConfig({
        accountSid: form.accountSid.trim(),
        whatsappFrom: form.whatsappFrom.trim(),
        wabaId: form.wabaId.trim() || undefined,
        ativo: form.ativo ? "S" : "N",
        authToken: form.authToken.trim() || undefined,
      });
      setMeta({
        authTokenConfigured: saved.authTokenConfigured,
        ultimoTesteEm: saved.ultimoTesteEm,
        ultimoTesteOk: saved.ultimoTesteOk,
      });
      setForm((f) => ({ ...f, authToken: "" }));
      toast.success("Configuração Twilio guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleTeste = async () => {
    const dest = testDestino.trim();
    if (!dest) {
      toast.error("Indique o telefone de destino do teste");
      return;
    }
    if (!form.accountSid.trim() || !form.whatsappFrom.trim()) {
      toast.error("Preencha Account SID e From antes do teste");
      return;
    }
    if (!meta.authTokenConfigured && !form.authToken.trim()) {
      toast.error("Indique o Auth Token na primeira configuração");
      return;
    }
    setTesting(true);
    try {
      await whatsappService.saveTwilioConfig({
        accountSid: form.accountSid.trim(),
        whatsappFrom: form.whatsappFrom.trim(),
        wabaId: form.wabaId.trim() || undefined,
        ativo: form.ativo ? "S" : "N",
        authToken: form.authToken.trim() || undefined,
      });
      await whatsappService.testeTwilio(dest, testMensagem.trim() || undefined);
      toast.success("Mensagem de teste enviada via Twilio");
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
      title="Conta Twilio"
      description="Credenciais WhatsApp Business (WABA) por tenant. O Auth Token fica cifrado no servidor; deixe em branco para manter o actual."
      actions={
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/15 hover:bg-white/[0.07] disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      }
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {meta.ultimoTesteEm ? (
          <p className="text-sm text-white/50">
            Último teste: {new Date(meta.ultimoTesteEm).toLocaleString("pt-BR")}
            {meta.ultimoTesteOk === "S"
              ? " — OK"
              : meta.ultimoTesteOk === "N"
                ? " — falhou"
                : ""}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Account SID
            </label>
            <InputText
              value={form.accountSid}
              onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
              placeholder="ACxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Auth Token {meta.authTokenConfigured ? "(deixe vazio para manter)" : ""}
            </label>
            <InputText
              type="password"
              value={form.authToken}
              onChange={(e) => setForm({ ...form, authToken: e.target.value })}
              placeholder={meta.authTokenConfigured ? "••••••••" : ""}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              WhatsApp From (E.164)
            </label>
            <InputText
              value={form.whatsappFrom}
              onChange={(e) => setForm({ ...form, whatsappFrom: e.target.value })}
              placeholder="whatsapp:+5585…"
              autoComplete="off"
            />
            <p className="text-[11px] text-white/35">
              Aceita com ou sem prefixo <code className="text-white/50">whatsapp:</code>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              WABA ID (opcional)
            </label>
            <InputText
              value={form.wabaId}
              onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
              placeholder="ID da WhatsApp Business Account"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <InputSwitch
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.value ?? false })}
            />
            <span className="text-sm text-white/70">Conta activa para envios</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            {saving ? "A guardar…" : "Guardar configuração"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm text-white/50">
            Guarda automaticamente a configuração acima antes de enviar. Requer templates
            aprovados (ou janela de 24h) conforme regras da Meta.
          </p>
          <p className="mb-3 text-sm font-semibold text-white/80">Teste de conectividade</p>
          <div className="flex flex-col gap-3">
            <InputText
              placeholder="+5585…"
              value={testDestino}
              onChange={(e) => setTestDestino(e.target.value)}
            />
            <InputTextarea
              rows={3}
              placeholder="Texto da mensagem de teste"
              value={testMensagem}
              onChange={(e) => setTestMensagem(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={testing}
                onClick={() => void handleTeste()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testing ? "A enviar…" : "Enviar teste"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </WhatsAppSectionShell>
  );
}
