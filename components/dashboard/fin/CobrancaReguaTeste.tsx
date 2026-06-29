"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { toast } from "sonner";
import { FlaskConical, Mail, MessageCircle, MessageSquare, RefreshCw, Search } from "lucide-react";
import {
  cobrancaReguaService,
  normalizeCobrancaReguaCanais,
  type CobrancaRegua,
  type CobrancaReguaCanal,
  type CobrancaReguaEtapa,
  type CobrancaReguaTesteTitulo,
} from "@/lib/cobranca-regua-service";
import { whatsappService, type ContratanteListItem } from "@/lib/whatsapp-service";
import { formatCpfDisplay } from "@/lib/format-cpf";
import { formatPhoneDisplay } from "@/lib/format-phone";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  DASHBOARD_SEARCH_ICON_COMPACT_CLASS,
  DASHBOARD_SEARCH_INPUT_COMPACT_CLASS,
  dashboardCellMono,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6";
const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white placeholder:text-white/25";
const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });
const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
  panel: { className: "border-white/10 bg-[#071C33] shadow-2xl" },
  item: { className: "text-white/90" },
};

type CobrancaReguaTesteProps = {
  regua: CobrancaRegua | null;
  onDisparado?: () => void;
};

export function CobrancaReguaTeste({ regua, onDisparado }: CobrancaReguaTesteProps) {
  const [clientes, setClientes] = useState<ContratanteListItem[]>([]);
  const [selected, setSelected] = useState<ContratanteListItem | null>(null);
  const [search, setSearch] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [etapaId, setEtapaId] = useState<string | null>(null);
  const [tituloResolvido, setTituloResolvido] = useState<CobrancaReguaTesteTitulo | null>(null);
  const [loadingTitulo, setLoadingTitulo] = useState(false);
  const [disparando, setDisparando] = useState<CobrancaReguaCanal | null>(null);

  const etapas = regua?.etapas ?? [];

  const etapaOptions = useMemo(
    () =>
      etapas.map((e) => ({
        label: `${e.offsetLabel} — ${e.nome}`,
        value: e.id,
      })),
    [etapas],
  );

  const etapaSeleccionada = useMemo(
    () => etapas.find((e) => e.id === etapaId) ?? null,
    [etapas, etapaId],
  );

  const temTituloExemplo = Boolean(tituloResolvido?.id && tituloResolvido.label);

  const loadClientes = useCallback(async (q: string) => {
    setLoadingClientes(true);
    try {
      const page = await whatsappService.listContratantes(0, 200, q);
      setClientes(page.content ?? []);
    } catch {
      toast.error("Erro ao carregar clientes.");
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const loadTituloResolvido = useCallback(async (contratanteId: number, etapa: string) => {
    setLoadingTitulo(true);
    try {
      const resolvido = await cobrancaReguaService.resolverTituloTeste(contratanteId, etapa);
      setTituloResolvido(resolvido);
    } catch {
      toast.error("Erro ao resolver título elegível.");
      setTituloResolvido(null);
    } finally {
      setLoadingTitulo(false);
    }
  }, []);

  useEffect(() => {
    void loadClientes("");
  }, [loadClientes]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadClientes(search), 350);
    return () => window.clearTimeout(t);
  }, [search, loadClientes]);

  useEffect(() => {
    if (!selected || !etapaId) {
      setTituloResolvido(null);
      return;
    }
    void loadTituloResolvido(selected.id, etapaId);
  }, [selected, etapaId, loadTituloResolvido]);

  const podeWhatsApp = (etapa: CobrancaReguaEtapa | null) =>
    etapa != null &&
    normalizeCobrancaReguaCanais(etapa).includes("WHATSAPP") &&
    Boolean(etapa.templateWhatsAppId);

  const podeEmail = (etapa: CobrancaReguaEtapa | null) =>
    etapa != null &&
    normalizeCobrancaReguaCanais(etapa).includes("EMAIL") &&
    Boolean(etapa.templateEmailId);

  const podeSms = (etapa: CobrancaReguaEtapa | null) =>
    etapa != null &&
    normalizeCobrancaReguaCanais(etapa).includes("SMS") &&
    Boolean(etapa.templateSmsId);

  const disparar = async (canal: CobrancaReguaCanal) => {
    if (!selected) {
      toast.error("Seleccione um cliente.");
      return;
    }
    if (!etapaId) {
      toast.error("Seleccione a etapa da régua.");
      return;
    }
    if (!temTituloExemplo) {
      toast.error("Nenhum título encontrado para usar no teste.");
      return;
    }
    if (canal === "WHATSAPP" && !podeWhatsApp(etapaSeleccionada)) {
      toast.error("Esta etapa não envia WhatsApp ou não tem modelo.");
      return;
    }
    if (canal === "EMAIL" && !podeEmail(etapaSeleccionada)) {
      toast.error("Esta etapa não envia e-mail ou não tem modelo.");
      return;
    }
    if (canal === "SMS" && !podeSms(etapaSeleccionada)) {
      toast.error("Esta etapa não envia SMS ou não tem modelo.");
      return;
    }

    setDisparando(canal);
    try {
      const result = await cobrancaReguaService.dispararTeste({
        etapaId,
        contratanteIds: [selected.id],
        canal,
      });

      const partes: string[] = [];
      if (result.enfileiradosWhatsApp > 0) {
        partes.push(`${result.enfileiradosWhatsApp} WhatsApp`);
      }
      if (result.enfileiradosEmail > 0) {
        partes.push(`${result.enfileiradosEmail} e-mail`);
      }
      if (result.enfileiradosSms > 0) {
        partes.push(`${result.enfileiradosSms} SMS`);
      }

      if (partes.length > 0) {
        toast.success(`Teste ${result.etapaNome}: ${partes.join(", ")} enfileirado(s).`);
      } else {
        toast.warning("Nenhuma mensagem enfileirada. Verifique telefone, e-mail e canais.");
      }

      const item = result.itens[0];
      if (item) {
        if (item.mensagemWhatsApp && !item.whatsAppEnfileirado && canal === "WHATSAPP") {
          toast.info(`WhatsApp: ${item.mensagemWhatsApp}`, { duration: 7000 });
        }
        if (item.mensagemEmail && !item.emailEnfileirado && canal === "EMAIL") {
          toast.info(`E-mail: ${item.mensagemEmail}`, { duration: 7000 });
        }
        if (item.mensagemSms && !item.smsEnfileirado && canal === "SMS") {
          toast.info(`SMS: ${item.mensagemSms}`, { duration: 7000 });
        }
      }

      onDisparado?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar teste.");
    } finally {
      setDisparando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/80">
            <FlaskConical className="h-4 w-4 text-amber-400" />
            Área de teste
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            Dispare os modelos da régua para um cliente real (telefone e e-mail do cadastro). O
            sistema usa automaticamente um boleto existente (do cliente ou, em alternativa, qualquer
            outro do tenant) só para preencher placeholders e PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadClientes(search);
            if (selected && etapaId) {
              void loadTituloResolvido(selected.id, etapaId);
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
        >
          <RefreshCw
            size={14}
            className={loadingClientes || loadingTitulo ? "animate-spin" : ""}
          />
          Atualizar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cn(CARD_CLASS, "flex min-h-[420px] flex-col")}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-white/80">Cliente</span>
            <span className="relative w-full sm:max-w-[260px]">
              <Search className={DASHBOARD_SEARCH_ICON_COMPACT_CLASS} size={16} aria-hidden />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome ou CPF…"
                className={cn(DASHBOARD_SEARCH_INPUT_COMPACT_CLASS, "text-sm bg-white/[0.04]")}
              />
            </span>
          </div>

          <div className={cn("min-h-0 flex-1", DASHBOARD_DATATABLE_INSET_SHELL_CLASS)}>
            <DataTable
              value={clientes}
              dataKey="id"
              selection={selected}
              onSelectionChange={(e) => setSelected((e.value as ContratanteListItem) ?? null)}
              selectionMode="single"
              loading={loadingClientes}
              scrollable
              scrollHeight="300px"
              className={cn(DASHBOARD_DATATABLE_CLASS, "text-sm")}
              emptyMessage="Nenhum cliente encontrado."
              pt={TABLE_PT}
            >
              <Column
                selectionMode="single"
                headerStyle={{ width: "3rem" }}
                bodyStyle={{ width: "3rem" }}
              />
              <Column
                field="nome"
                header="Nome"
                body={(row: ContratanteListItem) => dashboardCellText(row.nome)}
              />
              <Column
                field="telefoneCelular1"
                header="Celular"
                body={(row: ContratanteListItem) =>
                  dashboardCellMono(formatPhoneDisplay(row.telefoneCelular1))
                }
                style={{ width: "38%" }}
              />
              <Column
                field="cpf"
                header="CPF"
                body={(row: ContratanteListItem) =>
                  dashboardCellMono(row.cpf ? formatCpfDisplay(row.cpf) : null)
                }
                style={{ width: "32%" }}
              />
            </DataTable>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-white/80">Destinatário</p>
              {selected ? (
                <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                  <p className="font-medium text-white">{selected.nome}</p>
                  <p className="mt-1 text-white/50">
                    {formatPhoneDisplay(selected.telefoneCelular1) || "Sem celular"} ·{" "}
                    {selected.email?.trim() || "Sem e-mail"}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/40">Seleccione um cliente na tabela.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className={FORM_LABEL_CLASS}>Etapa da régua</label>
              <Dropdown
                value={etapaId}
                options={etapaOptions}
                onChange={(e) => setEtapaId(e.value ?? null)}
                placeholder="Seleccione a etapa"
                className="w-full"
                pt={DROPDOWN_PT}
                disabled={etapaOptions.length === 0}
              />
            </div>

            <div>
              <p className={FORM_LABEL_CLASS}>Título (PDF e placeholders)</p>
              {!selected || !etapaId ? (
                <p className="mt-2 text-sm text-white/40">
                  Seleccione cliente e etapa para ver o boleto de exemplo.
                </p>
              ) : loadingTitulo ? (
                <p className="mt-2 text-sm text-white/40">A carregar boleto de exemplo…</p>
              ) : temTituloExemplo ? (
                <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-white/80">
                  <p>{tituloResolvido?.label}</p>
                  <p className="mt-2 text-[11px] text-white/40">
                    {tituloResolvido?.doCliente
                      ? "Boleto do cliente seleccionado."
                      : "Boleto de outro cliente do tenant (o destinatário continua a ser o seleccionado)."}
                  </p>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/80">
                  Nenhum boleto encontrado no tenant para usar no teste.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={
                  !selected ||
                  !etapaId ||
                  !temTituloExemplo ||
                  disparando !== null ||
                  !podeWhatsApp(etapaSeleccionada)
                }
                onClick={() => void disparar("WHATSAPP")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-40 min-w-[140px]"
              >
                <MessageCircle className="h-4 w-4" />
                {disparando === "WHATSAPP" ? "A enviar…" : "WhatsApp"}
              </button>
              <button
                type="button"
                disabled={
                  !selected ||
                  !etapaId ||
                  !temTituloExemplo ||
                  disparando !== null ||
                  !podeEmail(etapaSeleccionada)
                }
                onClick={() => void disparar("EMAIL")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-sky-200 transition hover:bg-sky-500/15 disabled:opacity-40 min-w-[140px]"
              >
                <Mail className="h-4 w-4" />
                {disparando === "EMAIL" ? "A enviar…" : "E-mail"}
              </button>
              <button
                type="button"
                disabled={
                  !selected ||
                  !etapaId ||
                  !temTituloExemplo ||
                  disparando !== null ||
                  !podeSms(etapaSeleccionada)
                }
                onClick={() => void disparar("SMS")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-40 min-w-[140px]"
              >
                <MessageSquare className="h-4 w-4" />
                {disparando === "SMS" ? "A enviar…" : "SMS"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
