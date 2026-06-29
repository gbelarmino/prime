"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { Ban, Pencil, Play, Plus, RefreshCw } from "lucide-react";
import { CobrancaReguaTeste } from "@/components/dashboard/fin/CobrancaReguaTeste";
import { DashboardDataTableShell } from "@/components/dashboard/DashboardDataTableShell";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
  dashboardActionMenuItem,
  dashboardActionsMenuPt,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
  dashboardRowActionsCell,
  dashboardStatusBadge,
} from "@/lib/dashboard-datatable";
import {
  cobrancaReguaService,
  normalizeCobrancaReguaCanais,
  type CobrancaRegua,
  type CobrancaReguaCanal,
  type CobrancaReguaEtapa,
  type CobrancaReguaEtapaSavePayload,
  type CobrancaReguaExecucao,
} from "@/lib/cobranca-regua-service";
import { whatsappService, type WhatsAppTemplate } from "@/lib/whatsapp-service";
import { emailService, type EmailTemplate } from "@/lib/email-service";
import { smsService, type SmsTemplate } from "@/lib/sms-service";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
  panel: { className: "border-white/10 bg-[#071C33] shadow-2xl" },
  item: { className: "text-white/90" },
};

const TABLE_PT = dashboardDataTablePt({ paginator: false });
const EXEC_PT = dashboardDataTablePt({ density: "compact", paginator: true });

const CANAL_MULTISELECT_OPTIONS: { label: string; value: CobrancaReguaCanal }[] = [
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "E-mail", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
];

const CANAL_LABELS: Record<CobrancaReguaCanal, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  SMS: "SMS",
};

function formatCanaisLabel(canais: CobrancaReguaCanal[]): string {
  if (!canais.length) return "—";
  return canais.map((c) => CANAL_LABELS[c]).join(" + ");
}

const ATIVO_TONES: Record<string, string> = {
  Ativa: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  Inativa: "border-white/10 bg-white/10 text-white/45",
};

const EXEC_STATUS_TONES: Record<string, string> = {
  ENFILEIRADO: "border-sky-500/25 bg-sky-500/15 text-sky-300",
  ENVIADO: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  FALHA: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  CANCELADO: "border-white/10 bg-white/10 text-white/45",
};

type EtapaForm = {
  nome: string;
  codigo: string;
  ordem: number;
  offsetDias: number;
  canais: CobrancaReguaCanal[];
  templateWhatsAppId: string | null;
  templateEmailId: string | null;
  templateSmsId: string | null;
  ativa: boolean;
  anexoPdf: boolean;
};

function emptyForm(ordem: number): EtapaForm {
  return {
    nome: "",
    codigo: "",
    ordem,
    offsetDias: 0,
    canais: ["WHATSAPP", "EMAIL"],
    templateWhatsAppId: null,
    templateEmailId: null,
    templateSmsId: null,
    ativa: true,
    anexoPdf: true,
  };
}

function etapaToForm(e: CobrancaReguaEtapa): EtapaForm {
  return {
    nome: e.nome,
    codigo: e.codigo,
    ordem: e.ordem,
    offsetDias: e.offsetDias,
    canais: normalizeCobrancaReguaCanais(e),
    templateWhatsAppId: e.templateWhatsAppId ?? null,
    templateEmailId: e.templateEmailId ?? null,
    templateSmsId: e.templateSmsId ?? null,
    ativa: e.ativa,
    anexoPdf: e.anexoPdf,
  };
}

function formToPayload(form: EtapaForm): CobrancaReguaEtapaSavePayload {
  return {
    nome: form.nome.trim() || undefined,
    codigo: form.codigo.trim() || undefined,
    ordem: form.ordem,
    offsetDias: form.offsetDias,
    canais: form.canais,
    templateWhatsAppId: form.templateWhatsAppId,
    templateEmailId: form.templateEmailId,
    templateSmsId: form.templateSmsId,
    ativa: form.ativa,
    anexoPdf: form.anexoPdf,
  };
}

export function CobrancaReguaConfig() {
  const [regua, setRegua] = useState<CobrancaRegua | null>(null);
  const [execucoes, setExecucoes] = useState<CobrancaReguaExecucao[]>([]);
  const [wppTemplates, setWppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRegua, setSavingRegua] = useState(false);
  const [runningMotor, setRunningMotor] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<CobrancaReguaEtapa | null>(null);
  const [form, setForm] = useState<EtapaForm>(emptyForm(1));
  const [savingEtapa, setSavingEtapa] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<CobrancaReguaEtapa | null>(null);
  const menuRef = useRef<Menu>(null);

  const wppOptions = useMemo(
    () =>
      wppTemplates
        .filter((t) => !t.codigoEventoCatalogo || t.codigoEventoCatalogo === "REGUA_COBRANCA")
        .map((t) => ({ label: t.nome, value: t.id! })),
    [wppTemplates],
  );

  const emailOptions = useMemo(
    () =>
      emailTemplates
        .filter((t) => !t.codigoEventoCatalogo || t.codigoEventoCatalogo === "REGUA_COBRANCA")
        .map((t) => ({ label: t.nome, value: t.id! })),
    [emailTemplates],
  );

  const smsOptions = useMemo(
    () =>
      smsTemplates
        .filter((t) => !t.codigoEventoCatalogo || t.codigoEventoCatalogo === "REGUA_COBRANCA")
        .map((t) => ({ label: t.nome, value: t.id! })),
    [smsTemplates],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, execPage, wpp, eml, sms] = await Promise.all([
        cobrancaReguaService.obterPrincipal(),
        cobrancaReguaService.listarExecucoes(0, 15),
        whatsappService.listTemplates(),
        emailService.listTemplates(),
        smsService.listTemplates(),
      ]);
      setRegua(r);
      setExecucoes(execPage.content ?? []);
      setWppTemplates(wpp);
      setEmailTemplates(eml);
      setSmsTemplates(sms);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar régua.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRegua = async (ativa: boolean) => {
    if (!regua) return;
    setSavingRegua(true);
    try {
      const updated = await cobrancaReguaService.definirAtiva(regua.id, ativa);
      setRegua(updated);
      toast.success(ativa ? "Régua activada." : "Régua desactivada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível actualizar a régua.");
    } finally {
      setSavingRegua(false);
    }
  };

  const openNovaEtapa = () => {
    const proximaOrdem = (regua?.etapas?.length ?? 0) + 1;
    setEditingEtapa(null);
    setForm(emptyForm(proximaOrdem));
    setDialogOpen(true);
  };

  const openEditarEtapa = (etapa: CobrancaReguaEtapa) => {
    setEditingEtapa(etapa);
    setForm(etapaToForm(etapa));
    setDialogOpen(true);
  };

  const salvarEtapa = async () => {
    if (!regua) return;
    setSavingEtapa(true);
    try {
      const payload = formToPayload(form);
      if (editingEtapa) {
        await cobrancaReguaService.atualizarEtapa(regua.id, editingEtapa.id, payload);
        toast.success("Etapa actualizada.");
      } else {
        await cobrancaReguaService.criarEtapa(regua.id, payload);
        toast.success("Etapa criada.");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gravar a etapa.");
    } finally {
      setSavingEtapa(false);
    }
  };

  const desactivarEtapa = async (etapa: CobrancaReguaEtapa) => {
    if (!regua) return;
    try {
      await cobrancaReguaService.atualizarEtapa(regua.id, etapa.id, {
        ...formToPayload(etapaToForm(etapa)),
        ativa: false,
      });
      toast.success("Etapa desactivada.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desactivar etapa.");
    }
  };

  const executarMotor = async () => {
    setRunningMotor(true);
    try {
      const r = await cobrancaReguaService.executarMotor();
      toast.success(
        `Motor: ${r.enfileiradosWhatsApp} WA, ${r.enfileiradosEmail} e-mail, ${r.enfileiradosSms} SMS (${r.ignorados} ignorados, ${r.falhas} falhas).`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao executar motor.");
    } finally {
      setRunningMotor(false);
    }
  };

  const getEtapaActionItems = (etapa: CobrancaReguaEtapa): MenuItem[] => {
    const items: MenuItem[] = [
      dashboardActionMenuItem({
        label: "Editar etapa",
        icon: <Pencil size={16} className="text-blue-400 transition-transform group-hover:scale-110" />,
        onClick: () => openEditarEtapa(etapa),
      }),
    ];
    if (etapa.ativa) {
      items.push(
        dashboardActionMenuItem({
          label: "Desactivar",
          icon: <Ban size={16} className="text-rose-400 transition-transform group-hover:scale-110" />,
          labelClassName: "text-rose-300/90",
          onClick: () => void desactivarEtapa(etapa),
        }),
      );
    }
    return items;
  };

  const etapaActionBody = (row: CobrancaReguaEtapa) =>
    dashboardRowActionsCell((e: MouseEvent<HTMLButtonElement>) => {
      setSelectedEtapa(row);
      menuRef.current?.toggle(e);
    });

  const precisaWa = form.canais.includes("WHATSAPP");
  const precisaEmail = form.canais.includes("EMAIL");
  const precisaSms = form.canais.includes("SMS");

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/80">
              {regua?.nome ?? "Régua de cobrança"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
              {regua?.descricao ??
                "Etapas relativas ao vencimento (D-3, D0, D+N). Títulos EMITIDO ou VENCIDO; PDF anexo quando activo."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70">
              <span>Régua activa</span>
              <InputSwitch
                checked={regua?.ativa ?? false}
                disabled={!regua || savingRegua || loading}
                onChange={(e) => void toggleRegua(!!e.value)}
              />
            </label>
            <button
              type="button"
              disabled={!regua?.ativa || runningMotor}
              onClick={() => void executarMotor()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              {runningMotor ? "A executar…" : "Executar agora"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Etapas</h3>
            <p className="mt-1 text-sm text-white/50">
              Cada offset é único. Desactive etapas em vez de apagar para preservar o histórico.
            </p>
          </div>
          <button
            type="button"
            onClick={openNovaEtapa}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-amber-200 transition hover:border-amber-500/45 hover:bg-amber-500/15"
          >
            <Plus className="h-4 w-4" />
            Nova etapa
          </button>
        </div>

        <DashboardDataTableShell className={DASHBOARD_DATATABLE_SHELL_CLASS}>
          <DataTable
            value={regua?.etapas ?? []}
            loading={loading}
            className={DASHBOARD_DATATABLE_CLASS}
            pt={TABLE_PT}
            emptyMessage="Nenhuma etapa configurada."
            rowClassName={() => "text-white/90"}
          >
            <Column
              header="Offset"
              body={(row: CobrancaReguaEtapa) => dashboardCellMono(row.offsetLabel)}
              style={{ width: "6.5rem" }}
            />
            <Column header="Nome" body={(row: CobrancaReguaEtapa) => dashboardCellText(row.nome)} />
            <Column
              header="Canais"
              body={(row: CobrancaReguaEtapa) =>
                dashboardCellText(formatCanaisLabel(normalizeCobrancaReguaCanais(row)))
              }
              style={{ width: "10rem" }}
            />
            <Column
              header="Modelo WA"
              body={(row: CobrancaReguaEtapa) =>
                dashboardCellText(row.templateWhatsAppNome ?? "—")
              }
            />
            <Column
              header="Modelo e-mail"
              body={(row: CobrancaReguaEtapa) =>
                dashboardCellText(row.templateEmailNome ?? "—")
              }
            />
            <Column
              header="Modelo SMS"
              body={(row: CobrancaReguaEtapa) =>
                dashboardCellText(row.templateSmsNome ?? "—")
              }
            />
            <Column
              header="PDF"
              body={(row: CobrancaReguaEtapa) =>
                dashboardStatusBadge(row.anexoPdf ? "Sim" : "Não", {
                  Sim: "border-sky-500/25 bg-sky-500/15 text-sky-300",
                  Não: "border-white/10 bg-white/10 text-white/45",
                })
              }
              style={{ width: "5.5rem" }}
            />
            <Column
              header="Estado"
              body={(row: CobrancaReguaEtapa) =>
                dashboardStatusBadge(row.ativa ? "Ativa" : "Inativa", ATIVO_TONES)
              }
              style={{ width: "7rem" }}
            />
            <Column
              header="Ações"
              align="right"
              body={etapaActionBody}
              style={{ width: "5rem" }}
            />
          </DataTable>
        </DashboardDataTableShell>

        <Menu
          model={selectedEtapa ? getEtapaActionItems(selectedEtapa) : []}
          popup
          ref={menuRef}
          pt={dashboardActionsMenuPt()}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <CobrancaReguaTeste regua={regua} onDisparado={() => void load()} />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">
            Últimas execuções
          </h3>
          <p className="mt-1 text-sm text-white/50">
            Registo de envios enfileirados ou falhas por título, etapa e canal.
          </p>
        </div>

        <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
          <DataTable
            value={execucoes}
            className={DASHBOARD_DATATABLE_CLASS}
            pt={EXEC_PT}
            paginator
            rows={10}
            emptyMessage="Nenhuma execução registada."
            rowClassName={() => "text-white/90"}
          >
            <Column
              header="Etapa"
              body={(row: CobrancaReguaExecucao) => dashboardCellText(row.etapaNome)}
            />
            <Column
              header="Canal"
              body={(row: CobrancaReguaExecucao) =>
                dashboardCellText(
                  CANAL_LABELS[row.canal as CobrancaReguaCanal] ?? row.canal,
                )
              }
              style={{ width: "9rem" }}
            />
            <Column
              header="Status"
              body={(row: CobrancaReguaExecucao) =>
                dashboardStatusBadge(row.status, EXEC_STATUS_TONES)
              }
              style={{ width: "9rem" }}
            />
            <Column
              header="Venc. ref."
              body={(row: CobrancaReguaExecucao) => dashboardCellMono(row.referenciaVencimento)}
              style={{ width: "8rem" }}
            />
            <Column
              header="Erro"
              body={(row: CobrancaReguaExecucao) =>
                dashboardCellText(row.erro ?? "—")
              }
            />
          </DataTable>
        </div>
      </div>

      <DashboardDialog
        header={editingEtapa ? "Editar etapa" : "Nova etapa"}
        visible={dialogOpen}
        onHide={() => !savingEtapa && setDialogOpen(false)}
        className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl"
        pt={DIALOG_PT}
        modal
        draggable={false}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              disabled={savingEtapa}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={savingEtapa}
              onClick={() => void salvarEtapa()}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {savingEtapa ? "A gravar…" : "Gravar etapa"}
            </button>
          </div>
        }
      >
        <p className="mb-5 text-sm leading-relaxed text-white/45">
          Defina o offset em dias relativamente ao vencimento. Valores negativos disparam antes do
          vencimento; positivos, após (título já EMITIDO ou VENCIDO).
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Offset (dias)</label>
            <InputNumber
              value={form.offsetDias}
              onValueChange={(e) => setForm((f) => ({ ...f, offsetDias: e.value ?? 0 }))}
              className="w-full"
              inputClassName={FORM_INPUT_CLASS}
              showButtons
              buttonLayout="horizontal"
              decrementButtonClassName="p-button-secondary"
              incrementButtonClassName="p-button-secondary"
            />
            <p className="text-[11px] leading-relaxed text-white/35">
              Ex.: -3 (D-3), 0 (D0), 7 (D+7).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className={FORM_LABEL_CLASS}>Ordem</label>
            <InputNumber
              value={form.ordem}
              onValueChange={(e) => setForm((f) => ({ ...f, ordem: e.value ?? 1 }))}
              className="w-full"
              inputClassName={FORM_INPUT_CLASS}
              min={1}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className={FORM_LABEL_CLASS}>Nome (opcional)</label>
            <InputText
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className={FORM_INPUT_CLASS}
              placeholder="Ex.: Lembrete D-3"
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className={FORM_LABEL_CLASS}>Canais</label>
            <MultiSelect
              value={form.canais}
              options={CANAL_MULTISELECT_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) =>
                setForm((f) => ({ ...f, canais: (e.value as CobrancaReguaCanal[]) ?? [] }))
              }
              display="chip"
              placeholder="Seleccione os canais"
              className="w-full"
              pt={dashboardMultiSelectPt()}
            />
          </div>

          {precisaWa ? (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={FORM_LABEL_CLASS}>Modelo WhatsApp</label>
              <Dropdown
                value={form.templateWhatsAppId}
                options={wppOptions}
                onChange={(e) => setForm((f) => ({ ...f, templateWhatsAppId: e.value }))}
                className="w-full"
                placeholder="Seleccione o modelo"
                filter
                pt={DROPDOWN_PT}
              />
            </div>
          ) : null}

          {precisaEmail ? (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={FORM_LABEL_CLASS}>Modelo e-mail</label>
              <Dropdown
                value={form.templateEmailId}
                options={emailOptions}
                onChange={(e) => setForm((f) => ({ ...f, templateEmailId: e.value }))}
                className="w-full"
                placeholder="Seleccione o modelo"
                filter
                pt={DROPDOWN_PT}
              />
            </div>
          ) : null}

          {precisaSms ? (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={FORM_LABEL_CLASS}>Modelo SMS</label>
              <Dropdown
                value={form.templateSmsId}
                options={smsOptions}
                onChange={(e) => setForm((f) => ({ ...f, templateSmsId: e.value }))}
                className="w-full"
                placeholder="Seleccione o modelo"
                filter
                pt={DROPDOWN_PT}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/70">
              <InputSwitch
                checked={form.ativa}
                onChange={(e) => setForm((f) => ({ ...f, ativa: !!e.value }))}
              />
              Etapa activa
            </label>
            <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/70">
              <InputSwitch
                checked={form.anexoPdf}
                onChange={(e) => setForm((f) => ({ ...f, anexoPdf: !!e.value }))}
              />
              Anexar PDF do boleto
            </label>
          </div>
        </div>
      </DashboardDialog>
    </div>
  );
}
