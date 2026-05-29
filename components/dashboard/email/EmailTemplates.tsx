"use client";

import { useEffect, useRef, useState } from "react";
import {
  emailService,
  type EmailTemplate,
  type EventoPlaceholderCatalogo,
  type EventoSistemaCatalogo,
} from "@/lib/email-service";
import { substituteEmailPlaceholders } from "@/lib/email-template-placeholders";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { DashboardEmailHtmlEditor } from "@/components/dashboard/email/DashboardEmailHtmlEditor";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { FileText, Info, Plus, Save, X } from "lucide-react";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";

function stripHtmlPreview(html: string, maxLen = 120): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function EmailTemplates() {
  const menuRef = useRef<Menu>(null);
  const [selectedRow, setSelectedRow] = useState<EmailTemplate | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [eventosCatalogo, setEventosCatalogo] = useState<EventoSistemaCatalogo[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [current, setCurrent] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [placeholders, setPlaceholders] = useState<EventoPlaceholderCatalogo[]>([]);

  const defaultCodigo = () => (eventosCatalogo[0]?.codigo ?? "CONTRATO_CRIADO");

  const descricaoEvento = (codigo: string | null | undefined) => {
    if (!codigo) return "—";
    return eventosCatalogo.find((e) => e.codigo === codigo)?.descricao ?? codigo;
  };

  const fetchInitial = async () => {
    try {
      const [t, c] = await Promise.all([
        emailService.listTemplates(),
        emailService.listEventosCatalogo(),
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
    void emailService.listPlaceholdersPorEvento(codigo).then((list) => {
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
      assunto: "",
      conteudo: "<p>{{saudacoes}}, {{nome_cliente}}!</p>",
      codigoEventoCatalogo: defaultCodigo(),
    });
    setShowDialog(true);
  };

  const openEdit = async (template: EmailTemplate) => {
    let next: EmailTemplate = { ...template };
    if (!next.codigoEventoCatalogo?.trim()) {
      try {
        const gatilhos = await emailService.listGatilhos();
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

  const handleDelete = async (template: EmailTemplate) => {
    if (!template.id) return;
    if (!confirm(`Deseja excluir o modelo "${template.nome}"?`)) return;
    try {
      await emailService.deleteTemplate(template.id);
      toast.success("Modelo excluído");
      setTemplates(await emailService.listTemplates());
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleSave = async () => {
    if (!current?.nome.trim() || !current.assunto.trim() || !current.conteudo.trim()) {
      toast.error("Preencha nome, assunto e corpo");
      return;
    }
    if (!current.codigoEventoCatalogo?.trim()) {
      toast.error("Escolha o tipo de evento");
      return;
    }
    setSaving(true);
    try {
      await emailService.saveTemplate(current);
      setShowDialog(false);
      setTemplates(await emailService.listTemplates());
      toast.success("Modelo guardado");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const eventoOptions = eventosCatalogo.map((e) => ({ label: e.descricao, value: e.codigo }));

  const assuntoPreview =
    current?.assunto && placeholders.length > 0
      ? substituteEmailPlaceholders(current.assunto, placeholders)
      : current?.assunto;

  const actionItems: MenuItem[] = [
    {
      label: "Editar modelo",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedRow) void openEdit(selectedRow);
      },
    },
    { separator: true },
    {
      label: "Excluir modelo",
      icon: "pi pi-trash",
      command: () => {
        if (selectedRow) void handleDelete(selectedRow);
      },
    },
  ];

  const actionBody = (row: EmailTemplate) => (
    <div className="flex justify-end">
      <Button
        icon="pi pi-ellipsis-h"
        className="p-button-rounded p-button-text text-sky-400"
        onClick={(e) => {
          setSelectedRow(row);
          menuRef.current?.toggle(e);
        }}
      />
    </div>
  );

  return (
    <>
      <WhatsAppSectionShell
        eyebrow="Biblioteca"
        title="Modelos de e-mail"
        description="Assunto e corpo HTML com variáveis (ex.: nome do cliente). Editor visual com pré-visualização do e-mail renderizado."
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
            <Column field="nome" header="Nome" body={(r: EmailTemplate) => dashboardCellText(r.nome)} />
            <Column field="assunto" header="Assunto" body={(r: EmailTemplate) => dashboardCellText(r.assunto)} />
            <Column
              header="Evento"
              body={(r: EmailTemplate) => (
                <span className="text-[11px] text-white/55">{descricaoEvento(r.codigoEventoCatalogo)}</span>
              )}
            />
            <Column
              header="Prévia"
              body={(r: EmailTemplate) => (
                <p className="line-clamp-2 text-[11px] italic text-white/40">
                  {stripHtmlPreview(r.conteudo)}
                </p>
              )}
            />
            <Column header="Ações" body={actionBody} align="right" />
          </DataTable>
        </DashboardDataTableShell>
      </WhatsAppSectionShell>

      <DashboardDialog
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        header={current?.id ? "Editar modelo de e-mail" : "Novo modelo de e-mail"}
        className="w-full max-w-4xl border border-white/10 bg-[#071C33] shadow-2xl"
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
                  Assunto do e-mail
                </label>
                <Info className="h-3 w-3 text-sky-400/70" aria-hidden />
                <span className="text-[9px] uppercase tracking-widest text-white/35">suporta {"{{tokens}}"}</span>
              </div>
              <InputText
                value={current.assunto}
                onChange={(e) => setCurrent({ ...current, assunto: e.target.value })}
                placeholder="Ex.: Contrato {{numero_contrato}} registado"
                className="border-white/10 bg-white/[0.05] text-white"
              />
              {assuntoPreview && assuntoPreview !== current.assunto ? (
                <p className="text-[11px] text-white/45">
                  Prévia do assunto: <span className="text-white/70">{assuntoPreview}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Corpo do e-mail (HTML)
              </label>
              <DashboardEmailHtmlEditor
                value={current.conteudo}
                onChange={(html) => setCurrent({ ...current, conteudo: html })}
                placeholders={placeholders}
                assuntoPreview={current.assunto}
                minHeight="320px"
              />
            </div>
          </div>
        ) : null}
      </DashboardDialog>

      <Menu model={actionItems} popup ref={menuRef} />
    </>
  );
}
