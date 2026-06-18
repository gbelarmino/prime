"use client";

import { useEffect, useRef, useState } from "react";
import {
  whatsappService,
  WhatsAppTemplate,
  type EventoPlaceholderCatalogo,
  type EventoSistemaCatalogo,
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

export function WhatsAppTemplates() {
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<WhatsAppTemplate | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [eventosCatalogo, setEventosCatalogo] = useState<EventoSistemaCatalogo[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<WhatsAppTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [placeholdersRef, setPlaceholdersRef] = useState<EventoPlaceholderCatalogo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<WhatsAppTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const defaultCodigoEvento = () =>
    eventosCatalogo.length > 0 ? eventosCatalogo[0].codigo : "CONTRATO_CRIADO";

  const descricaoEvento = (codigo: string | null | undefined) => {
    if (!codigo) return "—";
    return eventosCatalogo.find((e) => e.codigo === codigo)?.descricao ?? codigo;
  };

  useEffect(() => {
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

  const fetchInitial = async () => {
    try {
      const [data, cat] = await Promise.all([
        whatsappService.listTemplates(),
        whatsappService.listEventosCatalogo(),
      ]);
      setTemplates(data);
      setEventosCatalogo(cat);
    } catch {
      toast.error("Erro ao carregar modelos");
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await whatsappService.listTemplates();
      setTemplates(data);
    } catch {
      toast.error("Erro ao carregar modelos");
    }
  };

  const handleNew = () => {
    setCurrentTemplate({
      nome: "",
      conteudo: "",
      codigoEventoCatalogo: defaultCodigoEvento(),
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

  const actionItems: MenuItem[] = [
    {
      label: "Editar modelo",
      icon: "pi pi-pencil",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => item.command?.({ originalEvent: e, item })}
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
    { separator: true },
    {
      label: "Excluir modelo",
      icon: "pi pi-trash",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => item.command?.({ originalEvent: e, item })}
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
        description="Textos reutilizáveis com variáveis (ex.: nome do cliente). Estes modelos são escolhidos nos gatilhos automáticos."
        actions={
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Novo modelo
          </button>
        }
      >
        <div className="-mx-3 overflow-x-auto border-b border-white/10 bg-white/5 sm:-mx-4">
            <DataTable
              value={templates}
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
                bodyClassName="font-semibold text-white/85"
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
