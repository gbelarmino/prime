"use client";

import { useEffect, useRef, useState } from "react";
import {
  smsService,
  type EventoPlaceholderCatalogo,
  type EventoSistemaCatalogo,
  type SmsTemplate,
} from "@/lib/sms-service";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { DashboardConfirmDialog } from "@/components/dashboard/DashboardConfirmDialog";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { FileText, Info, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import {
  DASHBOARD_ACTIONS_BUTTON_CLASS,
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardActionMenuItem,
  dashboardActionMenuSeparator,
  dashboardActionsMenuPt,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { cn } from "@/lib/utils";

const SMS_CHAR_LIMIT = 160;

function previewText(text: string, maxLen = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

export function SmsTemplates() {
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<SmsTemplate | null>(null);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [eventosCatalogo, setEventosCatalogo] = useState<EventoSistemaCatalogo[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [current, setCurrent] = useState<SmsTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<EventoPlaceholderCatalogo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<SmsTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const defaultCodigo = () => (eventosCatalogo[0]?.codigo ?? "CONTRATO_CRIADO");

  const descricaoEvento = (codigo: string | null | undefined) => {
    if (!codigo) return "—";
    return eventosCatalogo.find((e) => e.codigo === codigo)?.descricao ?? codigo;
  };

  const fetchInitial = async () => {
    try {
      const [t, c] = await Promise.all([
        smsService.listTemplates(),
        smsService.listEventosCatalogo(),
      ]);
      setTemplates(t);
      setEventosCatalogo(c);
    } catch {
      toast.error("Erro ao carregar modelos");
    }
  };

  useEffect(() => {
    void fetchInitial();
  }, []);

  useEffect(() => {
    if (!showDialog || !current?.codigoEventoCatalogo?.trim()) return;
    const codigo = current.codigoEventoCatalogo.trim();
    let cancelled = false;
    void smsService.listPlaceholdersPorEvento(codigo).then((list) => {
      if (!cancelled) setPlaceholders(list);
    }).catch(() => {
      if (!cancelled) setPlaceholders([]);
    });
    return () => {
      cancelled = true;
    };
  }, [showDialog, current?.codigoEventoCatalogo]);

  const openNew = () => {
    setCurrent({
      nome: "",
      descricao: "",
      conteudo: "{{saudacoes}}, {{nome_cliente}}!",
      codigoEventoCatalogo: defaultCodigo(),
    });
    setShowDialog(true);
  };

  const openEdit = async (template: SmsTemplate) => {
    let next: SmsTemplate = { ...template };
    if (!next.codigoEventoCatalogo?.trim()) {
      try {
        const gatilhos = await smsService.listGatilhos();
        const g = gatilhos.find((x) => x.template?.id === template.id);
        if (g?.evento) next = { ...next, codigoEventoCatalogo: g.evento };
      } catch {
        /* ignore */
      }
    }
    if (!next.codigoEventoCatalogo?.trim()) {
      next = { ...next, codigoEventoCatalogo: defaultCodigo() };
    }
    setCurrent(next);
    setShowDialog(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirm?.id) return;
    setDeleting(true);
    try {
      await smsService.deleteTemplate(deleteConfirm.id);
      toast.success("Modelo excluído");
      setDeleteConfirm(null);
      setTemplates(await smsService.listTemplates());
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!current?.nome.trim() || !current.conteudo.trim()) {
      toast.error("Preencha nome e conteúdo");
      return;
    }
    if (!current.codigoEventoCatalogo?.trim()) {
      toast.error("Escolha o tipo de evento");
      return;
    }
    setSaving(true);
    try {
      await smsService.saveTemplate(current);
      setShowDialog(false);
      setTemplates(await smsService.listTemplates());
      toast.success("Modelo guardado");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const eventoOptions = eventosCatalogo.map((e) => ({ label: e.descricao, value: e.codigo }));
  const charCount = current?.conteudo?.length ?? 0;
  const overLimit = charCount > SMS_CHAR_LIMIT;

  const actionItems: MenuItem[] = [
    dashboardActionMenuItem({
      label: "Editar modelo",
      icon: <Pencil size={16} className="text-sky-400 transition-transform group-hover:scale-110" />,
      onClick: () => {
        if (selectedRow) void openEdit(selectedRow);
      },
    }),
    dashboardActionMenuSeparator(),
    dashboardActionMenuItem({
      label: "Excluir modelo",
      icon: <Trash2 size={16} className="text-rose-400 transition-transform group-hover:scale-110" />,
      labelClassName: "text-rose-300/90",
      onClick: () => {
        if (selectedRow) setDeleteConfirm(selectedRow);
      },
    }),
  ];

  const actionBody = (row: SmsTemplate) => (
    <div className="flex justify-end">
      <Button
        icon="pi pi-ellipsis-h"
        className={DASHBOARD_ACTIONS_BUTTON_CLASS}
        onClick={(e) => {
          setSelectedRow(row);
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
        title="Modelos de SMS"
        description="Mensagens de texto com variáveis (ex.: nome do cliente). Recomendado até 160 caracteres por SMS."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-sky-900/25 transition hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            Novo modelo
          </button>
        }
      >
        <DashboardDataTableShell className={DASHBOARD_DATATABLE_SHELL_CLASS}>
          <DataTable
            value={templates}
            className={DASHBOARD_DATATABLE_CLASS}
            pt={dashboardDataTablePt()}
            rowHover
            emptyMessage={
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <FileText className="h-9 w-9 text-white/25" />
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">Nenhum modelo</p>
              </div>
            }
          >
            <Column field="nome" header="Nome" body={(r: SmsTemplate) => dashboardCellText(r.nome)} />
            <Column
              header="Evento"
              body={(r: SmsTemplate) => (
                <span className="text-[11px] text-white/55">{descricaoEvento(r.codigoEventoCatalogo)}</span>
              )}
            />
            <Column
              header="Caracteres"
              body={(r: SmsTemplate) => {
                const len = r.conteudo?.length ?? 0;
                return (
                  <span className={cn("font-mono text-xs", len > SMS_CHAR_LIMIT ? "text-amber-300" : "text-white/50")}>
                    {len}
                  </span>
                );
              }}
              style={{ width: "6rem" }}
            />
            <Column
              header="Prévia"
              body={(r: SmsTemplate) => (
                <p className="line-clamp-2 text-[11px] italic text-white/40">
                  {previewText(r.conteudo)}
                </p>
              )}
            />
            <Column header="Ações" body={actionBody} align="right" style={{ width: "4.5rem" }} />
          </DataTable>
        </DashboardDataTableShell>
      </WhatsAppSectionShell>

      <DashboardDialog
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        header={current?.id ? "Editar modelo de SMS" : "Novo modelo de SMS"}
        className="w-full max-w-2xl border border-white/10 bg-[#071C33] shadow-2xl"
        pt={{
          header: {
            className:
              "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
          },
          content: { className: "bg-transparent px-6 py-6 max-h-[min(85vh,900px)] overflow-y-auto" },
          footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
        }}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60"
            >
              <X size={16} />
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "A guardar…" : "Guardar"}
            </button>
          </div>
        }
      >
        {current ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Nome</label>
                <InputText
                  value={current.nome}
                  onChange={(e) => setCurrent({ ...current, nome: e.target.value })}
                  className="border-white/10 bg-white/[0.05] text-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Descrição</label>
                <InputText
                  value={current.descricao ?? ""}
                  onChange={(e) => setCurrent({ ...current, descricao: e.target.value })}
                  className="border-white/10 bg-white/[0.05] text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Tipo de evento (placeholders)
              </label>
              <Dropdown
                value={current.codigoEventoCatalogo}
                options={eventoOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => setCurrent({ ...current, codigoEventoCatalogo: e.value as string })}
                className="md:max-w-md border-white/10 bg-white/[0.05]"
                panelClassName="border border-white/10 bg-[#071C33]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Conteúdo do SMS
                </label>
                <Info className="h-3 w-3 text-sky-400/70" aria-hidden />
                <span className="text-[9px] uppercase tracking-widest text-white/35">suporta {"{{tokens}}"}</span>
              </div>
              <InputTextarea
                rows={6}
                value={current.conteudo}
                onChange={(e) => setCurrent({ ...current, conteudo: e.target.value })}
                className="border-white/10 bg-white/[0.05] text-white"
              />
              <p className={cn("text-[11px]", overLimit ? "text-amber-300/90" : "text-white/45")}>
                {charCount} / {SMS_CHAR_LIMIT} caracteres
                {overLimit ? " — mensagem pode ser dividida em vários SMS" : ""}
              </p>
              {placeholders.length > 0 ? (
                <p className="text-[10px] text-white/35">
                  Placeholders: {placeholders.map((p) => p.token).join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </DashboardDialog>

      <Menu model={actionItems} popup ref={menuRef} pt={dashboardActionsMenuPt()} />

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
