"use client";

import { useEffect, useState } from "react";
import { smsService, type SmsGatilho, type SmsTemplate } from "@/lib/sms-service";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "sonner";
import { RefreshCw, Zap } from "lucide-react";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

type EventoRow = { label: string; value: string };

export function SmsGatilhos() {
  const [gatilhos, setGatilhos] = useState<SmsGatilho[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [g, t, cat] = await Promise.all([
        smsService.listGatilhos(),
        smsService.listTemplates(),
        smsService.listEventosCatalogo(),
      ]);
      setGatilhos(g);
      setTemplates(t);
      setEventos(cat.map((e) => ({ label: e.descricao, value: e.codigo })));
    } catch {
      toast.error("Erro ao carregar gatilhos");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const getGatilho = (evento: string) => gatilhos.find((g) => g.evento === evento) ?? { evento, ativo: "N" };

  const templateOptions = templates.map((t) => ({ label: t.nome, value: t.id }));

  const handleUpdate = async (evento: string, templateId: string | null, ativo: boolean) => {
    const existing = getGatilho(evento);
    const template = templates.find((t) => t.id === templateId);
    setSaving(evento);
    try {
      const saved = await smsService.saveGatilho({
        ...existing,
        evento,
        template: template ? { id: template.id!, nome: template.nome } : null,
        ativo: ativo ? "S" : "N",
      });
      setGatilhos((prev) => {
        const i = prev.findIndex((g) => g.evento === evento);
        if (i >= 0) {
          const next = [...prev];
          next[i] = saved;
          return next;
        }
        return [...prev, saved];
      });
      toast.success("Gatilho atualizado");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <WhatsAppSectionShell
      surface="plain"
      eyebrow="Automação"
      title="Gatilhos de SMS"
      description="Canal independente do WhatsApp e e-mail. Active só os eventos que deseja enviar por SMS."
      actions={
        <button
          type="button"
          disabled={fetching}
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {eventos.map((ev) => {
          const g = getGatilho(ev.value);
          const ativo = g.ativo === "S";
          return (
            <div
              key={ev.value}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-sky-400" />
                <h3 className="font-semibold text-white">{ev.label}</h3>
                <span className="text-xs text-white/40">{ev.value}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Modelo</label>
                  <Dropdown
                    value={g.template?.id ?? null}
                    options={[{ label: "— nenhum —", value: null }, ...templateOptions]}
                    optionLabel="label"
                    optionValue="value"
                    disabled={saving === ev.value}
                    onChange={(e) => void handleUpdate(ev.value, e.value as string | null, ativo)}
                    placeholder="Seleccionar modelo"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <InputSwitch
                    checked={ativo}
                    disabled={saving === ev.value}
                    onChange={(e) =>
                      void handleUpdate(ev.value, g.template?.id ?? null, e.value ?? false)
                    }
                  />
                  <span className="text-sm text-white/70">{ativo ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WhatsAppSectionShell>
  );
}
