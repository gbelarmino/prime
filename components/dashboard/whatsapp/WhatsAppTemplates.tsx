"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  whatsappService,
  WhatsAppTemplate,
  type EventoPlaceholderCatalogo,
  type EventoSistemaCatalogo,
  type WhatsAppTemplateTwilio,
} from "@/lib/whatsapp-service";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Plus, Save, X, FileText, Info } from "lucide-react";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import { getTenantSlug } from "@/lib/auth-storage";

export function WhatsAppTemplates() {
  const menuRef = useRef<Menu>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<WhatsAppTemplate | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [twilioByTemplateId, setTwilioByTemplateId] = useState<
    Record<string, WhatsAppTemplateTwilio>
  >({});
  const [eventosCatalogo, setEventosCatalogo] = useState<EventoSistemaCatalogo[]>([]);
  const [twilioBusyId, setTwilioBusyId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<WhatsAppTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [placeholdersRef, setPlaceholdersRef] = useState<EventoPlaceholderCatalogo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<WhatsAppTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");

  const defaultCodigoEvento = () =>
    eventosCatalogo.length > 0 ? eventosCatalogo[0].codigo : "CONTRATO_CRIADO";

  const templatesFiltrados = templates.filter((t) => {
    if (filtroAtivo === "ativos") return t.ativo !== false;
    if (filtroAtivo === "inativos") return t.ativo === false;
    return true;
  });

  const descricaoEvento = (codigo: string | null | undefined) => {
    if (!codigo) return "—";
    return eventosCatalogo.find((e) => e.codigo === codigo)?.descricao ?? codigo;
  };

  useEffect(() => {
    setTenantSlug(getTenantSlug());
    void fetchInitial();
  }, []);

  useEffect(() => {
    if (!showDialog || !currentTemplate?.codigoEventoCatalogo?.trim()) return;
    const codigo = currentTemplate.codigoEventoCatalogo.trim();
    let cancelled = false;
    void (async () => {
      try {
        const list = await whatsappService.listPlaceholdersPorEvento(codigo);
        if (!cancelled) setPlaceholdersRef(list);
      } catch {
        if (!cancelled) setPlaceholdersRef([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDialog, currentTemplate?.codigoEventoCatalogo]);

  const indexTwilioByTemplateId = (list: WhatsAppTemplateTwilio[]) => {
    const map: Record<string, WhatsAppTemplateTwilio> = {};
    for (const t of list) {
      const key = String(t.templateId ?? "").toLowerCase();
      if (key) map[key] = t;
      const nome = (t.templateNome ?? "").trim().toLowerCase();
      if (nome) map[`nome:${nome}`] = t;
    }
    return map;
  };

  const indexTwilioFromTemplates = (list: WhatsAppTemplate[]) => {
    const map: Record<string, WhatsAppTemplateTwilio> = {};
    for (const t of list) {
      if (!t.id || !t.twilioStatus) continue;
      const key = String(t.id).toLowerCase();
      map[key] = {
        templateId: t.id,
        templateNome: t.nome,
        contentSid: t.twilioContentSid ?? "",
        status: t.twilioStatus,
      };
      const nome = (t.nome ?? "").trim().toLowerCase();
      if (nome) map[`nome:${nome}`] = map[key];
    }
    return map;
  };

  const twilioForTemplate = (r: WhatsAppTemplate) => {
    const byId = r.id ? twilioByTemplateId[String(r.id).toLowerCase()] : undefined;
    if (byId) return byId;
    if (r.twilioStatus) {
      return {
        templateId: r.id ?? "",
        templateNome: r.nome,
        contentSid: r.twilioContentSid ?? "",
        status: r.twilioStatus,
      } satisfies WhatsAppTemplateTwilio;
    }
    const nome = (r.nome ?? "").trim().toLowerCase();
    return nome ? twilioByTemplateId[`nome:${nome}`] : undefined;
  };

  const fetchInitial = async () => {
    try {
      const [data, cat] = await Promise.all([
        whatsappService.listTemplates(),
        whatsappService.listEventosCatalogo(),
      ]);
      setTemplates(data);
      setEventosCatalogo(cat);
      setTwilioByTemplateId(indexTwilioFromTemplates(data));
      try {
        const twilio = await whatsappService.listTwilioTemplates();
        if (twilio.length > 0) {
          setTwilioByTemplateId(indexTwilioByTemplateId(twilio));
        }
      } catch (e) {
        console.error(e);
        // Status já veio embutido em /templates; não zerar o mapa.
      }
    } catch {
      toast.error("Erro ao carregar modelos");
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await whatsappService.listTemplates();
      setTemplates(data);
      setTwilioByTemplateId(indexTwilioFromTemplates(data));
      try {
        const twilio = await whatsappService.listTwilioTemplates();
        if (twilio.length > 0) {
          setTwilioByTemplateId(indexTwilioByTemplateId(twilio));
        }
      } catch (e) {
        console.error(e);
      }
    } catch {
      toast.error("Erro ao carregar modelos");
    }
  };

  const handleCriarTwilio = async (template: WhatsAppTemplate, recreate = false) => {
    if (!template.id) return;
    if (twilioBusyId === template.id) return;
    setTwilioBusyId(template.id);
    try {
      const r = await whatsappService.criarTwilioTemplate(template.id, "UTILITY", recreate);
      toast.success(
        recreate
          ? "Novo Content SID criado e submetido à Meta"
          : "Template criado/submetido na Twilio",
      );
      const key = String(template.id).toLowerCase();
      setTwilioByTemplateId((prev) => ({ ...prev, [key]: r }));
      void fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar na Twilio");
    } finally {
      setTwilioBusyId(null);
    }
  };

  const handleSyncTwilio = async (template: WhatsAppTemplate) => {
    if (!template.id) return;
    setTwilioBusyId(template.id);
    try {
      const r = await whatsappService.syncTwilioTemplate(template.id);
      toast.success(`Status Twilio: ${r.status}`);
      const key = String(template.id).toLowerCase();
      setTwilioByTemplateId((prev) => ({ ...prev, [key]: r }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setTwilioBusyId(null);
    }
  };

  const handleSyncAllTwilio = async () => {
    setTwilioBusyId("__all__");
    try {
      const list = await whatsappService.syncAllTwilioTemplates();
      setTwilioByTemplateId(indexTwilioByTemplateId(list));
      await fetchTemplates();
      const aprovados = list.filter((t) => (t.status ?? "").toUpperCase() === "APPROVED").length;
      toast.success(
        aprovados > 0
          ? `Status Twilio sincronizado (${aprovados} aprovado${aprovados === 1 ? "" : "s"})`
          : "Status Twilio sincronizado",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setTwilioBusyId(null);
    }
  };

  const handleNew = () => {
    setCurrentTemplate({
      nome: "",
      conteudo: "",
      codigoEventoCatalogo: defaultCodigoEvento(),
      ativo: true,
    });
    setShowDialog(true);
  };

  const handleEdit = async (template: WhatsAppTemplate) => {
    let next: WhatsAppTemplate = { ...template };
    if (!next.codigoEventoCatalogo?.trim()) {
      try {
        const gatilhos = await whatsappService.listGatilhos();
        const g = gatilhos.find((x) => x.template?.id === template.id);
        if (g?.evento) next = { ...next, codigoEventoCatalogo: g.evento };
      } catch {
        /* ignore */
      }
    }
    if (!next.codigoEventoCatalogo?.trim()) {
      next = { ...next, codigoEventoCatalogo: defaultCodigoEvento() };
    }
    setCurrentTemplate(next);
    setShowDialog(true);
  };

  const handleClonar = async (template: WhatsAppTemplate) => {
    if (!template.id) return;
    try {
      const clone = await whatsappService.clonarTemplate(template.id);
      toast.success(`Clone criado: ${clone.nome}. Edite e submeta à Twilio quando estiver pronto.`);
      void fetchTemplates();
      if (clone.id) {
        await handleEdit(clone);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao clonar modelo");
    }
  };

  const handleToggleAtivo = async (template: WhatsAppTemplate) => {
    if (!template.id) return;
    const nextAtivo = template.ativo === false;
    try {
      await whatsappService.setTemplateAtivo(template.id, nextAtivo);
      toast.success(nextAtivo ? "Modelo reativado" : "Modelo desativado");
      void fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar modelo");
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirm?.id) return;
    setDeleting(true);
    try {
      await whatsappService.deleteTemplate(deleteConfirm.id);
      toast.success("Modelo excluído com sucesso");
      setDeleteConfirm(null);
      void fetchTemplates();
    } catch {
      toast.error("Erro ao excluir modelo");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!currentTemplate?.nome || !currentTemplate?.conteudo) {
      toast.error("Preencha nome e conteúdo");
      return;
    }
    if (!currentTemplate.codigoEventoCatalogo?.trim()) {
      toast.error("Escolha o tipo de evento para ver os placeholders corretos");
      return;
    }

    setSaving(true);
    try {
      await whatsappService.saveTemplate(currentTemplate);
      toast.success("Modelo salvo com sucesso");
      setShowDialog(false);
      void fetchTemplates();
    } catch {
      toast.error("Erro ao salvar modelo");
    } finally {
      setSaving(false);
    }
  };

  const eventoOptions = eventosCatalogo.map((e) => ({
    label: e.descricao,
    value: e.codigo,
  }));

  const runMenuCommand = (
    e: MouseEvent,
    item: MenuItem,
  ) => {
    // Evita double-fire: botão do template + handler nativo do Menu.
    e.preventDefault();
    e.stopPropagation();
    item.command?.({ originalEvent: e, item });
  };

  const actionItems: MenuItem[] = [
    {
      label: "Editar modelo",
      icon: "pi pi-pencil",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-pencil text-blue-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) void handleEdit(selectedRow);
      },
    },
    {
      label: "Clonar",
      icon: "pi pi-copy",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-copy text-sky-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) void handleClonar(selectedRow);
      },
    },
    {
      label: "Criar/submeter Twilio",
      icon: "pi pi-send",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-send text-emerald-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) void handleCriarTwilio(selectedRow, false);
      },
    },
    {
      label: "Sincronizar status Twilio",
      icon: "pi pi-refresh",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-refresh text-amber-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) void handleSyncTwilio(selectedRow);
      },
    },
    {
      label: selectedRow?.ativo === false ? "Reativar" : "Desativar",
      icon: selectedRow?.ativo === false ? "pi pi-check-circle" : "pi pi-ban",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i
            className={`${
              selectedRow?.ativo === false ? "pi pi-check-circle text-emerald-400" : "pi pi-ban text-amber-400"
            } transition-transform group-hover:scale-110`}
          />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) void handleToggleAtivo(selectedRow);
      },
    },
    { separator: true },
    {
      label: "Excluir modelo",
      icon: "pi pi-trash",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => runMenuCommand(e, item)}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-trash text-rose-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) setDeleteConfirm(selectedRow);
      },
    },
  ];

  const actionBodyTemplate = (rowData: WhatsAppTemplate) => (
    <div className="flex justify-end">
      <Button
        icon="pi pi-ellipsis-h"
        className="p-button-rounded p-button-text text-amber-400 transition-all hover:bg-amber-400/10 active:scale-90"
        onClick={(e) => {
          setSelectedRow(rowData);
          menuRef.current?.toggle(e);
        }}
        tooltip="Ações"
        tooltipOptions={{ position: "left" }}
      />
    </div>
  );

  return (
    <>
      <WhatsAppSectionShell
        eyebrow="Biblioteca"
        title="Modelos de mensagem"
        description={
          tenantSlug
            ? `Textos reutilizáveis com variáveis. Status Twilio reflete o tenant ativo (${tenantSlug}). Para nova versão na Meta, clone o modelo aprovado, edite e submeta.`
            : "Textos reutilizáveis com variáveis. Para alterar um modelo já aprovado na Meta, clone, edite e use Criar/submeter Twilio."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex overflow-hidden rounded-2xl border border-white/15">
              {(
                [
                  ["todos", "Todos"],
                  ["ativos", "Ativos"],
                  ["inativos", "Inativos"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFiltroAtivo(value)}
                  className={`px-3 py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition ${
                    filtroAtivo === value
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleSyncAllTwilio()}
              disabled={twilioBusyId === "__all__"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              Sync Twilio
            </button>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-500 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Novo modelo
            </button>
          </div>
        }
      >
        <div className="-mx-3 overflow-x-auto border-b border-white/10 bg-white/5 sm:-mx-4">
            <DataTable
              value={templatesFiltrados}
              loading={false}
              className="p-datatable-custom min-w-0 border-none bg-transparent"
              tableStyle={{ width: "100%", tableLayout: "auto" }}
              emptyMessage={
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <FileText className="mx-auto h-9 w-9 text-white/25" strokeWidth={1.25} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                    Nenhum modelo cadastrado
                  </p>
                  <p className="max-w-sm text-[11px] leading-relaxed text-white/35">
                    Crie o primeiro modelo para usar nos gatilhos.
                  </p>
                </div>
              }
              pt={{
                root: { className: "min-w-0" },
                wrapper: { className: "overflow-x-auto" },
                table: { className: "w-full min-w-0 bg-transparent" },
                header: { className: "bg-transparent border-white/5 p-6" },
                thead: { className: "bg-white/5" },
                headerRow: { className: "bg-transparent" },
                tbody: { className: "bg-transparent" },
                bodyRow: {
                  className:
                    "group border-white/5 bg-transparent transition-colors hover:bg-white/[0.02]",
                },
                column: {
                  headerCell: {
                    className:
                      "border-white/5 bg-transparent px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-white/40",
                  },
                  bodyCell: {
                    className: "border-white/5 px-8 py-5",
                  },
                },
              }}
            >
              <Column
                field="nome"
                header="Nome"
                headerClassName="text-left"
                body={(r: WhatsAppTemplate) => (
                  <div className="flex min-w-0 flex-col gap-1">
                    <span
                      className={`font-semibold ${
                        r.ativo === false ? "text-white/45 line-through" : "text-white/85"
                      }`}
                    >
                      {r.nome}
                    </span>
                    {r.ativo === false ? (
                      <span className="w-fit rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
                        Inativo
                      </span>
                    ) : null}
                  </div>
                )}
              />
              <Column
                field="descricao"
                header="Descrição"
                headerClassName="text-left"
                bodyClassName="text-xs text-white/45"
              />
              <Column
                header="Evento"
                headerClassName="text-left"
                body={(r) => (
                  <span className="text-[11px] text-white/55" title={r.codigoEventoCatalogo ?? ""}>
                    {descricaoEvento(r.codigoEventoCatalogo)}
                  </span>
                )}
                bodyClassName="text-left"
              />
              <Column
                field="conteudo"
                header="Prévia"
                headerClassName="text-left"
                body={(r) => (
                  <div className="min-w-0 max-w-[min(100vw,28rem)]">
                    <p className="line-clamp-2 break-words text-[11px] italic leading-snug text-white/40">
                      &ldquo;{r.conteudo}&rdquo;
                    </p>
                  </div>
                )}
              />
              <Column
                header="Twilio"
                headerClassName="text-left"
                body={(r: WhatsAppTemplate) => {
                  const tw = twilioForTemplate(r);
                  if (!tw) {
                    return (
                      <span className="text-[11px] text-white/35">
                        {twilioBusyId === r.id ? "…" : "não enviado"}
                      </span>
                    );
                  }
                  const sid = tw.contentSid ?? "";
                  const claiming = sid.startsWith("__CLAIMING__");
                  const st = (tw.status ?? "").toUpperCase();
                  const statusLabel =
                    st === "PENDING"
                      ? "EM ANÁLISE"
                      : st === "APPROVED"
                        ? "APROVADO"
                        : st === "REJECTED"
                          ? "REJEITADO"
                          : st === "DRAFT" || claiming
                            ? "RASCUNHO"
                            : tw.status;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          st === "APPROVED"
                            ? "text-emerald-400"
                            : st === "REJECTED"
                              ? "text-rose-400"
                              : "text-amber-400"
                        }`}
                      >
                        {statusLabel}
                      </span>
                      {!claiming && sid ? (
                        <span
                          className="max-w-[9rem] truncate font-mono text-[10px] text-white/35"
                          title={sid}
                        >
                          {sid}
                        </span>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Column
                header="Ações"
                body={actionBodyTemplate}
                align="right"
                headerClassName="text-right"
                bodyClassName="align-middle"
              />
            </DataTable>
          </div>
      </WhatsAppSectionShell>

      <DashboardDialog
        header={currentTemplate?.id ? "Editar modelo" : "Novo modelo"}
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        className="w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl"
        pt={{
          header: {
            className:
              "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
          },
          content: { className: "bg-transparent px-6 py-6" },
          footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
        }}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {!saving ? <Save size={16} /> : null}
              {saving ? "A guardar…" : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Nome do modelo
              </label>
              <InputText
                value={currentTemplate?.nome || ""}
                onChange={(e) => setCurrentTemplate((prev) => ({ ...prev!, nome: e.target.value }))}
                className="border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
                placeholder="Ex.: Contrato criado"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Descrição curta
              </label>
              <InputText
                value={currentTemplate?.descricao || ""}
                onChange={(e) => setCurrentTemplate((prev) => ({ ...prev!, descricao: e.target.value }))}
                className="border-white/10 bg-white/[0.05] p-3 text-white placeholder:text-white/25 focus:border-emerald-500/40"
                placeholder="Ex.: Enviada ao criar contrato"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Tipo de evento (placeholders)
            </label>
            <p className="text-[11px] leading-relaxed text-white/40">
              Escolha o evento alinhado a este modelo. Os tokens abaixo vêm da API para esse código.
            </p>
            <Dropdown
              value={currentTemplate?.codigoEventoCatalogo ?? null}
              options={eventoOptions}
              optionLabel="label"
              optionValue="value"
              placeholder={eventoOptions.length === 0 ? "Catálogo vazio — verifique a API" : "Selecione o evento"}
              disabled={eventoOptions.length === 0}
              onChange={(e) =>
                setCurrentTemplate((prev) =>
                  prev ? { ...prev, codigoEventoCatalogo: (e.value as string) ?? "" } : prev,
                )
              }
              className="w-full border-white/10 bg-white/[0.05] md:max-w-md"
              panelClassName="border border-white/10 bg-[#071C33] text-white"
              pt={{
                input: { className: "text-white" },
                trigger: { className: "text-white/70" },
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Conteúdo da mensagem
              </label>
              <div className="flex items-center gap-2 text-amber-400/75">
                <Info size={12} className="shrink-0" aria-hidden />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  Evento{" "}
                  <span className="font-mono text-amber-300/90">
                    {currentTemplate?.codigoEventoCatalogo?.trim() || "—"}
                  </span>
                  : toque num token para copiar.
                </span>
              </div>
            </div>
            {placeholdersRef.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                {placeholdersRef.map((ph) => (
                  <button
                    key={ph.id}
                    type="button"
                    title={ph.descricao + (ph.exemplo ? ` — ex.: ${ph.exemplo}` : "")}
                    onClick={() => {
                      void navigator.clipboard.writeText(ph.token);
                      toast.success(`Copiado: ${ph.token}`);
                    }}
                    className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-200/90 transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
                  >
                    {ph.token}
                  </button>
                ))}
              </div>
            ) : currentTemplate?.codigoEventoCatalogo?.trim() ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">
                Nenhum placeholder registado para este evento na base de dados.
              </p>
            ) : null}
            <InputTextarea
              value={currentTemplate?.conteudo || ""}
              onChange={(e) => setCurrentTemplate((prev) => ({ ...prev!, conteudo: e.target.value }))}
              rows={8}
              className="resize-none border-white/10 bg-white/[0.05] p-4 leading-relaxed text-white placeholder:text-white/25 focus:border-emerald-500/40"
              placeholder="{{saudacoes}}, {{nome_cliente}}! O contrato {{numero_contrato}} no valor de {{valor_total}} refere-se a {{imovel_descricao}}."
            />
          </div>
        </div>
      </DashboardDialog>

      <Menu
        model={actionItems}
        popup
        ref={menuRef}
        id="popup_menu_whatsapp_templates"
        pt={{
          root: { className: "w-max rounded-xl border border-white/10 bg-[#071C33] py-2 shadow-2xl" },
          menu: { className: "p-0" },
          menuitem: { className: "transition-all duration-200" },
          action: { className: "flex items-center px-0 py-0 no-underline" },
        }}
      />

      <DashboardConfirmDialog
        visible={!!deleteConfirm}
        onHide={() => setDeleteConfirm(null)}
        onConfirm={() => void confirmDeleteTemplate()}
        header="Excluir modelo"
        tone="danger"
        confirmLabel="Excluir"
        loading={deleting}
        message={
          <p>
            Deseja excluir o modelo{" "}
            <span className="font-semibold text-white">«{deleteConfirm?.nome}»</span>? Esta ação não pode ser
            desfeita.
          </p>
        }
      />
    </>
  );
}
