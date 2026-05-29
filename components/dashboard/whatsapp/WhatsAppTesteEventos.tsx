"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { RefreshCw, Search, UserCheck, Users, X } from "lucide-react";
import {
  whatsappService,
  WHATSAPP_TITULO_COBRANCA_TESTE_ID,
  type ContratanteListItem,
  type EventoSistemaCatalogo,
  type WhatsAppGatilho,
} from "@/lib/whatsapp-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
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
  "flex min-h-[440px] flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6";
const TABLE_SCROLL = "340px";
const TABLE_PT = dashboardDataTablePt({ density: "compact", paginator: false });

function cpfCell(row: ContratanteListItem) {
  const raw = row.cpf?.trim();
  if (!raw) return dashboardCellMono(null);
  return dashboardCellMono(formatCpfDisplay(raw));
}

export function WhatsAppTesteEventos() {
  const [eventos, setEventos] = useState<EventoSistemaCatalogo[]>([]);
  const [gatilhos, setGatilhos] = useState<WhatsAppGatilho[]>([]);
  const [clientes, setClientes] = useState<ContratanteListItem[]>([]);
  const [selected, setSelected] = useState<ContratanteListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [disparando, setDisparando] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, gat] = await Promise.all([
        whatsappService.listEventosCatalogo(),
        whatsappService.listGatilhos(),
      ]);
      setEventos(ev);
      setGatilhos(gat);
    } catch {
      toast.error("Erro ao carregar eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadCatalog();
    void loadClientes("");
  }, [loadCatalog, loadClientes]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadClientes(search), 350);
    return () => window.clearTimeout(t);
  }, [search, loadClientes]);

  const gatilhoAtivoComTemplate = (codigo: string) => {
    const g = gatilhos.find((x) => x.evento === codigo);
    return Boolean(g?.ativo === "S" && g.template?.id);
  };

  const removerSeleccionado = (id: number) => {
    setSelected((prev) => prev.filter((c) => c.id !== id));
  };

  const limparSeleccionados = () => setSelected([]);

  const handleDisparar = async (codigo: string, descricao: string) => {
    if (selected.length === 0) {
      toast.error("Seleccione pelo menos um cliente.");
      return;
    }
    setDisparando(codigo);
    try {
      const result = await whatsappService.dispararTesteEvento(
        codigo,
        selected.map((c) => c.id),
      );
      if (result.enfileirados > 0) {
        toast.success(
          `${descricao}: ${result.enfileirados} enfileirada(s), ${result.ignorados} ignorada(s).`,
        );
      } else {
        toast.warning(`${descricao}: nenhuma mensagem enfileirada. Verifique gatilhos e telefones.`);
      }
      const falhas = result.itens.filter((i) => !i.enfileirado);
      if (falhas.length > 0 && falhas.length <= 3) {
        falhas.forEach((f) =>
          toast.info(`${f.contratanteNome}: ${f.mensagem}`, { duration: 6000 }),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar evento.");
    } finally {
      setDisparando(null);
    }
  };

  const removeBody = (row: ContratanteListItem) => (
    <button
      type="button"
      onClick={() => removerSeleccionado(row.id)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
      aria-label={`Remover ${row.nome}`}
    >
      <X size={14} />
    </button>
  );

  return (
    <WhatsAppSectionShell
      eyebrow="Ferramenta"
      title="Teste de eventos"
      description="Seleccione os clientes que receberão a notificação e dispare cada evento como em produção (gatilho + modelo + fila)."
      actions={
        <button
          type="button"
          onClick={() => {
            void loadCatalog();
            void loadClientes(search);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      }
      surface="plain"
    >
      <div className="flex flex-col gap-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lista completa */}
          <section className={CARD_CLASS}>
            <div className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <Users size={18} className="text-blue-400" />
                Todos os clientes
              </div>
              <span className="relative w-full sm:max-w-[260px]">
                <Search
                  className={DASHBOARD_SEARCH_ICON_COMPACT_CLASS}
                  size={16}
                  aria-hidden
                />
                <InputText
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nome ou CPF…"
                  className={cn(DASHBOARD_SEARCH_INPUT_COMPACT_CLASS, "text-sm bg-white/[0.04]")}
                />
              </span>
            </div>

            <div className={cn("min-h-0 flex-1 pt-1", DASHBOARD_DATATABLE_INSET_SHELL_CLASS)}>
              <DataTable
                value={clientes}
                dataKey="id"
                selection={selected}
                onSelectionChange={(e) =>
                  setSelected((e.value as ContratanteListItem[]) ?? [])
                }
                selectionMode="checkbox"
                loading={loadingClientes}
                scrollable
                scrollHeight={TABLE_SCROLL}
                stripedRows
                className={cn(DASHBOARD_DATATABLE_CLASS, "text-sm")}
                emptyMessage="Nenhum cliente encontrado."
                pt={TABLE_PT}
              >
                <Column
                  selectionMode="multiple"
                  headerStyle={{ width: "3.25rem" }}
                  bodyStyle={{ width: "3.25rem" }}
                />
                <Column
                  field="nome"
                  header="Nome"
                  body={(row: ContratanteListItem) => dashboardCellText(row.nome)}
                  style={{ width: "38%" }}
                />
                <Column
                  field="telefoneCelular1"
                  header="Celular"
                  body={(row: ContratanteListItem) =>
                    dashboardCellMono(formatPhoneDisplay(row.telefoneCelular1))
                  }
                  style={{ width: "32%" }}
                />
                <Column
                  field="cpf"
                  header="CPF"
                  body={cpfCell}
                  style={{ width: "30%" }}
                />
              </DataTable>
            </div>
          </section>

          {/* Seleccionados */}
          <section className={CARD_CLASS}>
            <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <UserCheck size={18} className="text-emerald-400" />
                Seleccionados para envio
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  {selected.length}
                </span>
              </div>
              {selected.length > 0 ? (
                <button
                  type="button"
                  onClick={limparSeleccionados}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/35 transition-colors hover:text-rose-300"
                >
                  Limpar tudo
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 pt-1">
              {selected.length === 0 ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-10 text-center">
                  <UserCheck size={32} className="mb-3 text-white/15" />
                  <p className="text-sm font-medium text-white/50">
                    Nenhum cliente seleccionado
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-white/30">
                    Marque os clientes na lista à esquerda para incluí-los no disparo de teste.
                  </p>
                </div>
              ) : (
                <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
                  <DataTable
                    value={selected}
                    dataKey="id"
                    scrollable
                    scrollHeight={TABLE_SCROLL}
                    stripedRows
                    className={cn(DASHBOARD_DATATABLE_CLASS, "text-sm")}
                    pt={TABLE_PT}
                  >
                    <Column
                      field="nome"
                      header="Nome"
                      body={(row: ContratanteListItem) => dashboardCellText(row.nome)}
                      style={{ width: "48%" }}
                    />
                    <Column
                      field="telefoneCelular1"
                      header="Celular"
                      body={(row: ContratanteListItem) =>
                        dashboardCellMono(formatPhoneDisplay(row.telefoneCelular1))
                      }
                      style={{ width: "40%" }}
                    />
                    <Column
                      header=""
                      body={removeBody}
                      style={{ width: "3.5rem" }}
                      exportable={false}
                    />
                  </DataTable>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Eventos */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-7">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Disparar evento
          </p>
          {loading ? (
            <p className="text-sm text-white/40">A carregar eventos…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {eventos.map((ev) => {
                const pronto = gatilhoAtivoComTemplate(ev.codigo);
                return (
                  <div
                    key={ev.codigo}
                    className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[15px] font-semibold leading-snug text-white/90">
                        {ev.descricao}
                      </p>
                      <p className="font-mono text-[11px] text-white/35">{ev.codigo}</p>
                      {!pronto ? (
                        <p className="pt-1 text-xs leading-relaxed text-amber-300/80">
                          Configure gatilho activo e modelo em Gatilhos automáticos.
                        </p>
                      ) : null}
                      {ev.codigo === "COBRANCA_PARCELA" && pronto ? (
                        <p className="pt-1 text-xs leading-relaxed text-white/40">
                          Anexo: PDF do título{" "}
                          <span className="font-mono text-[10px] text-white/55">
                            {WHATSAPP_TITULO_COBRANCA_TESTE_ID}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      label="Disparar"
                      icon="pi pi-play"
                      onClick={() => void handleDisparar(ev.codigo, ev.descricao)}
                      disabled={!pronto || selected.length === 0 || disparando !== null}
                      loading={disparando === ev.codigo}
                      className={cn(
                        "w-full rounded-xl border-0 py-2.5 text-xs font-bold uppercase tracking-widest",
                        pronto
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : "bg-white/10 text-white/40",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WhatsAppSectionShell>
  );
}
