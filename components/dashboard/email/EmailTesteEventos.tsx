"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import {
  emailService,
  type ContratanteListItem,
  type EmailGatilho,
  type EventoSistemaCatalogo,
} from "@/lib/email-service";
import { WhatsAppSectionShell } from "@/components/dashboard/whatsapp/WhatsAppSectionShell";
import {
  DASHBOARD_DATATABLE_CLASS,
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  dashboardCellText,
  dashboardDataTablePt,
} from "@/lib/dashboard-datatable";

export function EmailTesteEventos() {
  const [eventos, setEventos] = useState<EventoSistemaCatalogo[]>([]);
  const [gatilhos, setGatilhos] = useState<EmailGatilho[]>([]);
  const [clientes, setClientes] = useState<ContratanteListItem[]>([]);
  const [selected, setSelected] = useState<ContratanteListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [disparando, setDisparando] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, gat, page] = await Promise.all([
        emailService.listEventosCatalogo(),
        emailService.listGatilhos(),
        emailService.listContratantes(0, 100, ""),
      ]);
      setEventos(ev);
      setGatilhos(gat);
      setClientes(page.content ?? []);
    } catch {
      toast.error("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const searchClientes = async () => {
    try {
      const page = await emailService.listContratantes(0, 200, search);
      setClientes(page.content ?? []);
    } catch {
      toast.error("Erro na busca");
    }
  };

  const gatilhoActivo = (codigo: string) => gatilhos.find((g) => g.evento === codigo)?.ativo === "S";

  const disparar = async (codigo: string) => {
    if (selected.length === 0) {
      toast.error("Seleccione pelo menos um cliente");
      return;
    }
    setDisparando(codigo);
    try {
      const res = await emailService.dispararTesteEvento(
        codigo,
        selected.map((c) => c.id),
      );
      toast.success(`${res.enfileirados} enfileirado(s), ${res.ignorados} ignorado(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao disparar");
    } finally {
      setDisparando(null);
    }
  };

  return (
    <WhatsAppSectionShell
      surface="plain"
      eyebrow="Validação"
      title="Teste de eventos"
      description="Enfileira e-mails como nos gatilhos reais. Requer SMTP configurado e gatilho activo (ou regista motivo de ignorado)."
      actions={
        <button
          type="button"
          onClick={() => void loadCatalog()}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={DASHBOARD_DATATABLE_INSET_SHELL_CLASS}>
          <div className="mb-3 flex gap-2">
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente"
              className="flex-1"
            />
            <Button icon={<Search className="h-4 w-4" />} onClick={() => void searchClientes()} />
          </div>
          <DataTable
            value={clientes}
            selection={selected}
            onSelectionChange={(e) => setSelected(e.value as ContratanteListItem[])}
            selectionMode="checkbox"
            dataKey="id"
            className={DASHBOARD_DATATABLE_CLASS}
            pt={dashboardDataTablePt({ density: "compact", paginator: false })}
            scrollable
            scrollHeight="340px"
          >
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column field="nome" header="Cliente" body={(r: ContratanteListItem) => dashboardCellText(r.nome)} />
            <Column field="email" header="E-mail" body={(r: ContratanteListItem) => dashboardCellText(r.email ?? "—")} />
          </DataTable>
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-white/50">A carregar eventos…</p>
          ) : (
            eventos.map((ev) => (
              <div
                key={ev.codigo}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div>
                  <p className="font-semibold text-white">{ev.descricao}</p>
                  <p className="text-xs text-white/40">
                    {ev.codigo} · gatilho {gatilhoActivo(ev.codigo) ? "activo" : "inactivo"}
                  </p>
                </div>
                <Button
                  label="Disparar"
                  loading={disparando === ev.codigo}
                  disabled={disparando !== null}
                  onClick={() => void disparar(ev.codigo)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </WhatsAppSectionShell>
  );
}
