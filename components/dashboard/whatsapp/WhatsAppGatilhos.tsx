"use client";

import { useEffect, useState } from "react";
import { whatsappService, WhatsAppGatilho, WhatsAppTemplate } from "@/lib/whatsapp-service";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { toast } from "sonner";
import { Bolt, RefreshCw, Zap } from "lucide-react";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";

type EventoCatalogoRow = { label: string; value: string };

export function WhatsAppGatilhos() {
  const [gatilhos, setGatilhos] = useState<WhatsAppGatilho[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [eventosCatalogo, setEventosCatalogo] = useState<EventoCatalogoRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [gData, tData, catData] = await Promise.all([
        whatsappService.listGatilhos(),
        whatsappService.listTemplates(),
        whatsappService.listEventosCatalogo(),
      ]);
      setGatilhos(gData);
      setTemplates(tData);
      setEventosCatalogo(
        catData.map((e) => ({
          label: e.descricao,
          value: e.codigo,
        })),
      );
    } catch {
      toast.error("Erro ao carregar dados");
      setEventosCatalogo([]);
    } finally {
      setFetching(false);
    }
  };

  const getGatilhoPorEvento = (evento: string): WhatsAppGatilho => {
    return gatilhos.find((g) => g.evento === evento) ?? { evento, ativo: "N" };
  };

  const handleUpdateGatilho = async (evento: string, templateId: string | null, ativo: boolean) => {
    const existing = gatilhos.find((g) => g.evento === evento);
    const template = templates.find((t) => t.id === templateId);

    const payload: WhatsAppGatilho = {
      ...existing,
      evento,
      template: template || undefined,
      ativo: ativo ? "S" : "N",
    };

    setSaving(evento);
    try {
      const saved = await whatsappService.saveGatilho(payload);
      setGatilhos((prev) => {
        const index = prev.findIndex((g) => g.evento === evento);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [...prev, saved];
      });
      toast.success(`Gatilho atualizado`);
    } catch {
      toast.error("Erro ao salvar gatilho");
    } finally {
      setSaving(null);
    }
  };

  return (
    <WhatsAppSectionShell
      surface="plain"
      eyebrow="Automação"
      title="Gatilhos por evento"
      description="Ligue cada evento do sistema a um modelo. As alterações são gravadas ao mudar o modelo ou o interruptor."
      actions={
        <button
          type="button"
          disabled={fetching}
          onClick={() => void fetchData()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white/90 disabled:pointer-events-none disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      }
      footer={
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Gravação imediata</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/45">
                Cada mudança no modelo ou em &ldquo;Ativo&rdquo; envia o gatilho para a API de imediato. Confirme que existem
                modelos na página anterior antes de ativar.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="app-whatsapp-gatilhos space-y-3">
        {eventosCatalogo.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/50">
            Nenhum evento no catálogo. Confirme que a API aplicou as migrações e que o endpoint{" "}
            <span className="font-mono text-white/70">/api/whatsapp/eventos-catalogo</span> devolve dados.
          </p>
        ) : null}
        {eventosCatalogo.map((evt) => {
            const g = getGatilhoPorEvento(evt.value);
            const isSaving = saving === evt.value;
            const active = g.ativo === "S";

            return (
              <div
                key={evt.value}
                className="group flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-white/[0.1] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                      active
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border-white/10 bg-white/[0.04] text-white/30"
                    }`}
                  >
                    <Bolt size={22} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-tight text-white transition group-hover:text-emerald-200/95">
                      {evt.label}
                    </h3>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {evt.value}
                    </p>
                  </div>
                </div>

                {/* Mobile: empilhado com espaçamento uniforme */}
                <div className="flex w-full flex-col gap-4 sm:hidden">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/35"
                      htmlFor={`tpl-${evt.value}`}
                    >
                      Modelo
                    </label>
                    <Dropdown
                      inputId={`tpl-${evt.value}`}
                      value={g.template?.id}
                      options={templates}
                      optionLabel="nome"
                      optionValue="id"
                      onChange={(e) => void handleUpdateGatilho(evt.value, e.value, g.ativo === "S")}
                      placeholder="Selecione um modelo"
                      disabled={isSaving}
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
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/35">
                      Ativo
                    </span>
                    <InputSwitch
                      checked={active}
                      disabled={isSaving}
                      onChange={(e) => void handleUpdateGatilho(evt.value, g.template?.id || null, e.value)}
                    />
                  </div>
                </div>

                {/* Desktop: grelha — rótulos na mesma linha, controlos alinhados ao centro vertical */}
                <div className="hidden w-full min-w-0 sm:grid sm:w-auto sm:grid-cols-[minmax(12rem,16rem)_3.25rem] sm:gap-x-6 sm:gap-y-2">
                  <label
                    className="col-start-1 row-start-1 self-end pb-1 text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/35"
                    htmlFor={`tpl-${evt.value}-desktop`}
                  >
                    Modelo
                  </label>
                  <span className="col-start-2 row-start-1 self-end pb-1 text-center text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/35">
                    Ativo
                  </span>

                  <div className="col-start-1 row-start-2 min-w-0 self-center">
                    <Dropdown
                      inputId={`tpl-${evt.value}-desktop`}
                      value={g.template?.id}
                      options={templates}
                      optionLabel="nome"
                      optionValue="id"
                      onChange={(e) => void handleUpdateGatilho(evt.value, e.value, g.ativo === "S")}
                      placeholder="Selecione um modelo"
                      disabled={isSaving}
                      className="w-full border-white/10 bg-white/[0.05] text-white"
                      pt={{
                        root: {
                          className:
                            "flex h-11 w-full min-w-[12rem] max-w-[16rem] items-center rounded-xl border border-white/10 bg-white/[0.05] text-white",
                        },
                        input: { className: "text-sm text-white/90" },
                        panel: { className: "border border-white/10 bg-[#071C33]" },
                        item: { className: "text-sm text-white/75 hover:bg-white/[0.06]" },
                      }}
                    />
                  </div>
                  <div className="col-start-2 row-start-2 flex justify-center self-center">
                    <InputSwitch
                      checked={active}
                      disabled={isSaving}
                      onChange={(e) => void handleUpdateGatilho(evt.value, g.template?.id || null, e.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </WhatsAppSectionShell>
  );
}
