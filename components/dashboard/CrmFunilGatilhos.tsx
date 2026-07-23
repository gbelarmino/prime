"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { MultiSelect } from "primereact/multiselect";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2, RefreshCw } from "lucide-react";
import {
  fetchFunilEtapas,
  fetchFunilGatilhos,
  saveFunilGatilho,
  type FunilGatilhoCanal,
  type FunilGatilhoDestinatario,
  type FunilGatilhoDto,
  type FunilEventoCodigo,
} from "@/lib/crm-service";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import { smsService, type SmsTemplate } from "@/lib/sms-service";
import { whatsappService, type WhatsAppTemplate } from "@/lib/whatsapp-service";

const DESTINATARIO_OPTIONS: { label: string; value: FunilGatilhoDestinatario }[] = [
  { label: "Corretor atribuído", value: "CORRETOR" },
  { label: "Lead (telefone do card)", value: "LEAD" },
];

const CANAL_OPTIONS: { label: string; value: FunilGatilhoCanal }[] = [
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "SMS", value: "SMS" },
];

type GatilhoRow = FunilGatilhoDto & {
  etapasDestinoIds: number[];
};

function toRow(dto: FunilGatilhoDto): GatilhoRow {
  const canal: FunilGatilhoCanal =
    dto.canal === "SMS" ? "SMS" : "WHATSAPP";
  return {
    ...dto,
    canal,
    destinatario: dto.destinatario ?? "CORRETOR",
    etapasDestinoIds: dto.condicao?.etapasDestinoIds ?? [],
  };
}

export function CrmFunilGatilhos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rows, setRows] = useState<GatilhoRow[]>([]);
  const [wppTemplates, setWppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [etapas, setEtapas] = useState<{ label: string; value: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gatilhos, wppTpl, smsTpl, etapasList] = await Promise.all([
        fetchFunilGatilhos(),
        whatsappService.listTemplates(),
        smsService.listTemplates(),
        fetchFunilEtapas(),
      ]);
      setRows(gatilhos.map(toRow));
      setWppTemplates(wppTpl.filter((t) => t.ativo !== false));
      setSmsTemplates(smsTpl);
      setEtapas(etapasList.map((e) => ({ label: e.nome, value: e.id })));
    } catch {
      toast.error("Erro ao carregar gatilhos do funil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wppTemplatesPorEvento = useMemo(() => {
    const map = new Map<string, WhatsAppTemplate[]>();
    for (const row of rows) {
      map.set(
        row.eventoCodigo,
        wppTemplates.filter((t) => t.codigoEventoCatalogo === row.eventoCodigo),
      );
    }
    return map;
  }, [rows, wppTemplates]);

  const smsTemplatesPorEvento = useMemo(() => {
    const map = new Map<string, SmsTemplate[]>();
    for (const row of rows) {
      map.set(
        row.eventoCodigo,
        smsTemplates.filter((t) => t.codigoEventoCatalogo === row.eventoCodigo),
      );
    }
    return map;
  }, [rows, smsTemplates]);

  const persist = async (row: GatilhoRow) => {
    if (!row.destinatario) {
      toast.error("Selecione o destinatário");
      return;
    }
    setSaving(row.eventoCodigo);
    try {
      const saved = await saveFunilGatilho({
        eventoCodigo: row.eventoCodigo as FunilEventoCodigo,
        canal: row.canal,
        destinatario: row.destinatario,
        templateId: row.canal === "WHATSAPP" ? row.templateId : null,
        templateSmsId: row.canal === "SMS" ? row.templateSmsId : null,
        linhaId: row.canal === "WHATSAPP" ? row.linhaId : null,
        ativo: row.ativo,
        condicao:
          row.etapasDestinoIds.length > 0
            ? { etapasDestinoIds: row.etapasDestinoIds }
            : null,
      });
      setRows((prev) =>
        prev.map((r) => (r.eventoCodigo === saved.eventoCodigo ? toRow(saved) : r)),
      );
      toast.success("Gatilho guardado");
    } catch {
      toast.error("Erro ao guardar gatilho");
    } finally {
      setSaving(null);
    }
  };

  const updateRow = (eventoCodigo: string, patch: Partial<GatilhoRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.eventoCodigo === eventoCodigo ? { ...r, ...patch } : r)),
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/50">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link
        href="/dashboard/crm/funil"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden />
        Voltar ao funil
      </Link>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
          <Bell size={14} aria-hidden />
          CRM · Automação
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-white">
          Gatilhos do funil
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
          Notificações WhatsApp ou SMS quando ocorrem eventos do pipeline. Crie modelos com categoria do evento
          correspondente.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5"
        >
          <RefreshCw size={16} aria-hidden />
          Atualizar
        </button>
      </header>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/50">
            Nenhum evento de lead configurável.
          </p>
        ) : null}

        {rows.map((row) => {
          const wppOptions = wppTemplatesPorEvento.get(row.eventoCodigo) ?? [];
          const smsOptions = smsTemplatesPorEvento.get(row.eventoCodigo) ?? [];
          const isSaving = saving === row.eventoCodigo;
          const mvpReady = row.eventoCodigo === "LEAD_ETAPA_ALTERADA";
          const isSms = row.canal === "SMS";

          return (
            <div
              key={row.eventoCodigo}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{row.eventoNome}</h2>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                    {row.eventoCodigo}
                  </p>
                  {!mvpReady ? (
                    <p className="mt-1 text-xs text-amber-400/80">Disparo automático em breve — só configuração.</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Ativo</span>
                  <InputSwitch
                    checked={row.ativo}
                    disabled={isSaving || !mvpReady}
                    onChange={(e) => {
                      const next = { ...row, ativo: e.value ?? false };
                      updateRow(row.eventoCodigo, { ativo: next.ativo });
                      void persist(next);
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Canal</label>
                  <Dropdown
                    value={row.canal}
                    options={CANAL_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    disabled={isSaving}
                    onChange={(e) => {
                      const canal = (e.value as FunilGatilhoCanal) ?? "WHATSAPP";
                      const next = {
                        ...row,
                        canal,
                        templateId: canal === "WHATSAPP" ? row.templateId : null,
                        templateNome: canal === "WHATSAPP" ? row.templateNome : null,
                        templateSmsId: canal === "SMS" ? row.templateSmsId : null,
                        templateSmsNome: canal === "SMS" ? row.templateSmsNome : null,
                        linhaId: canal === "SMS" ? null : row.linhaId,
                        linhaNome: canal === "SMS" ? null : row.linhaNome,
                      };
                      updateRow(row.eventoCodigo, next);
                      void persist(next);
                    }}
                    className="w-full"
                    pt={{
                      root: { className: "h-11 w-full rounded-xl border border-white/10 bg-white/[0.05]" },
                      input: { className: "text-sm text-white/90" },
                      panel: { className: "border border-white/10 bg-[#071C33]" },
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Destinatário
                  </label>
                  <Dropdown
                    value={row.destinatario}
                    options={DESTINATARIO_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    disabled={isSaving}
                    onChange={(e) => {
                      const next = { ...row, destinatario: e.value as FunilGatilhoDestinatario };
                      updateRow(row.eventoCodigo, { destinatario: next.destinatario });
                      void persist(next);
                    }}
                    className="w-full"
                    pt={{
                      root: { className: "h-11 w-full rounded-xl border border-white/10 bg-white/[0.05]" },
                      input: { className: "text-sm text-white/90" },
                      panel: { className: "border border-white/10 bg-[#071C33]" },
                    }}
                  />
                </div>

                {isSms ? (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                      Modelo SMS
                    </label>
                    <Dropdown
                      value={row.templateSmsId}
                      options={smsOptions}
                      optionLabel="nome"
                      optionValue="id"
                      placeholder={
                        smsOptions.length ? "Selecione um modelo" : "Crie um modelo SMS com este evento"
                      }
                      disabled={isSaving}
                      onChange={(e) => {
                        const tpl = smsOptions.find((t) => t.id === e.value);
                        const next = {
                          ...row,
                          templateSmsId: (e.value as string) ?? null,
                          templateSmsNome: tpl?.nome ?? null,
                        };
                        updateRow(row.eventoCodigo, {
                          templateSmsId: next.templateSmsId,
                          templateSmsNome: next.templateSmsNome,
                        });
                        void persist(next);
                      }}
                      className="w-full"
                      pt={{
                        root: { className: "h-11 w-full rounded-xl border border-white/10 bg-white/[0.05]" },
                        input: { className: "text-sm text-white/90" },
                        panel: { className: "border border-white/10 bg-[#071C33]" },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                      Modelo WhatsApp
                    </label>
                    <Dropdown
                      value={row.templateId}
                      options={wppOptions}
                      optionLabel="nome"
                      optionValue="id"
                      placeholder={
                        wppOptions.length ? "Selecione um modelo" : "Crie um modelo com este evento"
                      }
                      disabled={isSaving}
                      onChange={(e) => {
                        const tpl = wppOptions.find((t) => t.id === e.value);
                        const next = {
                          ...row,
                          templateId: (e.value as string) ?? null,
                          templateNome: tpl?.nome ?? null,
                        };
                        updateRow(row.eventoCodigo, {
                          templateId: next.templateId,
                          templateNome: next.templateNome,
                        });
                        void persist(next);
                      }}
                      className="w-full"
                      pt={{
                        root: { className: "h-11 w-full rounded-xl border border-white/10 bg-white/[0.05]" },
                        input: { className: "text-sm text-white/90" },
                        panel: { className: "border border-white/10 bg-[#071C33]" },
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Só ao entrar nestas etapas (opcional)
                  </label>
                  <MultiSelect
                    value={row.etapasDestinoIds}
                    options={etapas}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Qualquer etapa de destino"
                    disabled={isSaving || !mvpReady}
                    onChange={(e) => {
                      const ids = (e.value as number[]) ?? [];
                      const next = { ...row, etapasDestinoIds: ids };
                      updateRow(row.eventoCodigo, { etapasDestinoIds: ids });
                      void persist(next);
                    }}
                    display="chip"
                    className="w-full"
                    pt={dashboardMultiSelectPt()}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
