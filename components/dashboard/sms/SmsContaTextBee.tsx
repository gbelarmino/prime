"use client";

import { useEffect, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Send, Download } from "lucide-react";
import {
  smsService,
  TEXTBEE_API_PRESET,
  type SmsTextBeeConfig,
} from "@/lib/sms-service";
import { smsAtendimentoChatService } from "@/lib/sms-atendimento-chat-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import { cn } from "@/lib/utils";

const DEFAULT_TEST_MESSAGE = "Mensagem de teste do painel Aires.";

export function SmsContaTextBee() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [testDestino, setTestDestino] = useState("");
  const [testMensagem, setTestMensagem] = useState(DEFAULT_TEST_MESSAGE);
  const [form, setForm] = useState({
    deviceId: "",
    apiKey: "",
    apiBaseUrl: TEXTBEE_API_PRESET.apiBaseUrl,
    ativo: true,
  });
  const [meta, setMeta] = useState<Pick<SmsTextBeeConfig, "apiKeyConfigurada" | "ultimoTesteEm" | "ultimoTesteOk">>({});

  const load = async () => {
    setLoading(true);
    try {
      const cfg = await smsService.getTextBeeConfig();
      if (cfg) {
        setForm({
          deviceId: cfg.deviceId ?? "",
          apiKey: "",
          apiBaseUrl: cfg.apiBaseUrl ?? TEXTBEE_API_PRESET.apiBaseUrl,
          ativo: cfg.ativo ?? true,
        });
        setMeta({
          apiKeyConfigurada: cfg.apiKeyConfigurada,
          ultimoTesteEm: cfg.ultimoTesteEm,
          ultimoTesteOk: cfg.ultimoTesteOk,
        });
      }
    } catch {
      toast.error("Erro ao carregar conta TextBee");
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
      const saved = await smsService.saveTextBeeConfig({
        deviceId: form.deviceId.trim(),
        apiBaseUrl: form.apiBaseUrl.trim() || TEXTBEE_API_PRESET.apiBaseUrl,
        ativo: form.ativo ? "S" : "N",
        apiKey: form.apiKey.trim() || undefined,
      });
      setMeta({
        apiKeyConfigurada: saved.apiKeyConfigurada,
        ultimoTesteEm: saved.ultimoTesteEm,
        ultimoTesteOk: saved.ultimoTesteOk,
      });
      setForm((f) => ({ ...f, apiKey: "" }));
      toast.success("Conta TextBee guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleTeste = async () => {
    const dest = testDestino.trim();
    const mensagem = testMensagem.trim();
    if (!dest) {
      toast.error("Indique o telefone de destino do teste");
      return;
    }
    if (!mensagem) {
      toast.error("Indique a mensagem do teste");
      return;
    }
    if (!form.deviceId.trim()) {
      toast.error("Preencha o device ID antes do teste");
      return;
    }
    if (!meta.apiKeyConfigurada && !form.apiKey.trim()) {
      toast.error("Indique a API key na primeira configuração");
      return;
    }
    setTesting(true);
    try {
      await smsService.saveTextBeeConfig({
        deviceId: form.deviceId.trim(),
        apiBaseUrl: form.apiBaseUrl.trim() || TEXTBEE_API_PRESET.apiBaseUrl,
        ativo: form.ativo ? "S" : "N",
        apiKey: form.apiKey.trim() || undefined,
      });
      await smsService.testeTextBee(dest, mensagem);
      toast.success("SMS de teste enviado");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Teste falhou");
    } finally {
      setTesting(false);
    }
  };

  const handleMigrarHistorico = async () => {
    setMigrating(true);
    try {
      const result = await smsAtendimentoChatService.migrarHistorico();
      const n =
        typeof result.mensagensImportadas === "number"
          ? result.mensagensImportadas
          : typeof result.migradas === "number"
            ? result.migradas
            : null;
      toast.success(
        n != null
          ? `Histórico importado (${n} mensagem${n === 1 ? "" : "s"})`
          : "Histórico SMS importado",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar histórico");
    } finally {
      setMigrating(false);
    }
  };

  const charCount = testMensagem.length;

  return (
    <WhatsAppSectionShell
      eyebrow="Integrações"
      title="Conta TextBee"
      description="Uma conta por tenant. A API key fica cifrada no servidor; deixe em branco para manter a actual."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || migrating}
            onClick={() => void handleMigrarHistorico()}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-950/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-sky-200/90 transition hover:border-sky-400/45 hover:bg-sky-900/40 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {migrating ? "A importar…" : "Importar histórico"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/15 hover:bg-white/[0.07] disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
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
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Device ID</label>
            <InputText value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              API key {meta.apiKeyConfigurada ? "(deixe vazio para manter)" : ""}
            </label>
            <InputText type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">URL base da API</label>
            <InputText value={form.apiBaseUrl} onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <InputSwitch checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.value ?? false })} />
            <span className="text-sm text-white/70">Conta activa para envios automáticos</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            {saving ? "A guardar…" : "Guardar configuração"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-sm text-white/50">
            Guarda automaticamente a configuração acima antes de enviar.
          </p>
          <p className="mb-3 text-sm font-semibold text-white/80">Teste de conectividade</p>
          <div className="flex flex-col gap-3">
            <InputText
              placeholder="+5511999999999"
              value={testDestino}
              onChange={(e) => setTestDestino(e.target.value)}
            />
            <InputTextarea
              rows={4}
              placeholder="Texto do SMS de teste"
              value={testMensagem}
              onChange={(e) => setTestMensagem(e.target.value)}
            />
            <p className={cn("text-[11px]", charCount > 160 ? "text-amber-300/90" : "text-white/45")}>
              {charCount} / 160 caracteres
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={testing}
                onClick={() => void handleTeste()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 disabled:opacity-50"
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
