"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Search, User, ExternalLink, Clock, FileText, Home } from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { toast } from "sonner";
import { usePaginatedSpringList } from "@/hooks/use-paginated-spring-list";
import {
  DASHBOARD_SEARCH_ICON_HEADER_CLASS,
  DASHBOARD_SEARCH_INPUT_HEADER_CLASS,
} from "@/lib/dashboard-datatable";
import {
  getAuditoriaAtividadesUrl,
  isApiConfigured,
  type AuditoriaAtividadesQuery,
} from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  labelAcaoAuditoria,
  MODULO_AUDITORIA_OPTIONS,
  type UsuarioAtividadeApi,
} from "@/lib/validations/auditoria";

const MODULO_TONES: Record<string, string> = {
  AUTH: "border-slate-500/20 text-slate-300 bg-slate-500/5",
  USUARIO: "border-violet-500/20 text-violet-400 bg-violet-500/5",
  IMOVEL: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5",
  CONTRATO: "border-amber-500/20 text-amber-400 bg-amber-500/5",
  FIN: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
  ATENDIMENTO: "border-blue-500/20 text-blue-400 bg-blue-500/5",
  TENANT: "border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-500/5",
  CRM: "border-rose-500/20 text-rose-400 bg-rose-500/5",
};

const MODULO_LABELS: Record<string, string> = {
  AUTH: "Auth",
  USUARIO: "Usuário",
  IMOVEL: "Imóvel",
  CONTRATO: "Contrato",
  FIN: "Financeiro",
  ATENDIMENTO: "Atendimento",
  TENANT: "Organização",
  CRM: "CRM",
};

const TABLE_PT = {
  header: { className: "bg-transparent border-white/5 p-6" },
  table: { className: "bg-transparent" },
  thead: { className: "bg-white/5" },
  headerRow: { className: "bg-transparent" },
  bodyRow: {
    className: "bg-transparent border-white/5 hover:bg-white/[0.02] transition-colors",
  },
  column: {
    headerCell: {
      className:
        "bg-transparent border-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest py-4 px-6",
    },
    bodyCell: { className: "border-white/5 py-4 px-6" },
  },
  paginator: {
    root: { className: "bg-transparent border-white/5 p-4" },
    pages: { className: "flex gap-1" },
    pageButton: ({ context }: { context?: { active?: boolean } }) => ({
      className: cn(
        "rounded-lg border-none transition-all w-8 h-8 flex items-center justify-center",
        context?.active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          : "bg-white/5 text-white/60 hover:bg-blue-600 hover:text-white",
      ),
    }),
  },
};

const MENU_PT = {
  root: { className: "bg-[#071C33] border-white/10 shadow-2xl rounded-xl py-2 w-max" },
  menu: { className: "p-0" },
  menuitem: { className: "transition-all duration-200" },
  action: { className: "px-4 py-3 flex items-center gap-3 no-underline" },
  icon: { className: "text-sm" },
  label: { className: "text-xs font-bold uppercase tracking-widest text-white/70" },
};

function formatDataHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function entidadeHref(row: UsuarioAtividadeApi): string | null {
  const meta = row.metadados ?? {};
  const contratoFromMeta =
    typeof meta.contratoId === "number"
      ? meta.contratoId
      : typeof meta.contratoId === "string"
        ? Number(meta.contratoId)
        : null;

  if (row.entidadeTipo === "CONTRATO" && row.entidadeId) {
    return `/dashboard/contratos/edit?id=${row.entidadeId}`;
  }
  if (row.entidadeTipo === "IMOVEL" && row.entidadeId) {
    return `/dashboard/imoveis/edit?id=${row.entidadeId}`;
  }
  if (row.entidadeTipo === "USUARIO" && row.entidadeId) {
    return `/dashboard/usuarios/edit?id=${row.entidadeId}`;
  }
  if (row.entidadeTipo === "TITULO" && contratoFromMeta) {
    return `/dashboard/contratos/edit?id=${contratoFromMeta}`;
  }
  return null;
}

function imovelLabel(row: UsuarioAtividadeApi): string | null {
  const empreendimento = row.imovelEmpreendimento?.trim();
  if (!empreendimento) return null;
  const parts = [empreendimento];
  const quadra = row.imovelQuadra?.trim();
  if (quadra) parts.push(`Q. ${quadra}`);
  if (row.imovelLote != null) parts.push(`Lt. ${row.imovelLote}`);
  return parts.join(" · ");
}

function entidadeLabel(row: UsuarioAtividadeApi): string {
  if (!row.entidadeTipo) return "—";
  if (row.entidadeUuid) {
    return `${row.entidadeTipo} · ${String(row.entidadeUuid).slice(0, 8)}…`;
  }
  if (row.entidadeId != null) {
    return `${row.entidadeTipo} #${row.entidadeId}`;
  }
  return row.entidadeTipo;
}

export function AuditoriaList() {
  const menuRef = useRef<Menu>(null);
  const [modulo, setModulo] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [detalhe, setDetalhe] = useState<UsuarioAtividadeApi | null>(null);
  const [selectedRow, setSelectedRow] = useState<UsuarioAtividadeApi | null>(null);

  const buildUrl = useCallback(
    (page: number, size: number, q: string) => {
      const query: AuditoriaAtividadesQuery = {};
      const term = q.trim();
      if (term) query.q = term;
      if (modulo) query.modulo = modulo;
      if (dataInicio) query.dataInicio = dataInicio;
      if (dataFim) query.dataFim = dataFim;
      return getAuditoriaAtividadesUrl(page, size, query);
    },
    [modulo, dataInicio, dataFim],
  );

  const {
    searchInput,
    setSearchInput,
    params,
    setPage,
    pageSize,
    loading,
    pageData,
  } = usePaginatedSpringList<UsuarioAtividadeApi>({
    buildUrl,
    pageSize: 10,
    fallbackErrorMessage: "Não foi possível carregar o log de auditoria.",
    onFetchError: (m) => toast.error(m),
  });

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;

  const onPageChange = (event: { page?: number }) => {
    setPage(event.page ?? 0);
  };

  const actionItems: MenuItem[] = [
    {
      label: "Ver detalhes",
      icon: "pi pi-eye",
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={(e) => item.command?.({ originalEvent: e, item })}
          className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
        >
          <i className="pi pi-eye text-emerald-400 transition-transform group-hover:scale-110" />
          <span className="whitespace-nowrap text-left text-xs font-bold uppercase tracking-widest text-white/70">
            {item.label}
          </span>
        </button>
      ),
      command: () => {
        if (selectedRow) setDetalhe(selectedRow);
      },
    },
  ];

  const quandoBodyTemplate = (rowData: UsuarioAtividadeApi) => (
    <div className="flex items-center gap-2 text-sm text-white/60">
      <Clock size={14} className="text-blue-400/60" />
      <span className="font-mono tabular-nums tracking-tight">
        {formatDataHora(rowData.dataHora)}
      </span>
    </div>
  );

  const usuarioBodyTemplate = (rowData: UsuarioAtividadeApi) => {
    const email = rowData.usuarioEmail?.trim();
    const display = email ?? "—";
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/10 bg-blue-500/10 text-blue-400 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
          <User size={18} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold leading-tight text-white">{display}</span>
          {rowData.usuarioRole ? (
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              {rowData.usuarioRole}
            </span>
          ) : (
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              ID: #{rowData.usuarioId ?? "—"}
            </span>
          )}
        </div>
      </div>
    );
  };

  const moduloBodyTemplate = (rowData: UsuarioAtividadeApi) => (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
        MODULO_TONES[rowData.modulo] ?? "border-white/10 bg-white/5 text-white/80",
      )}
    >
      {MODULO_LABELS[rowData.modulo] ?? rowData.modulo}
    </span>
  );

  const acaoBodyTemplate = (rowData: UsuarioAtividadeApi) => (
    <span className="text-sm text-white/60">{labelAcaoAuditoria(rowData.acao)}</span>
  );

  const imovelBodyTemplate = (rowData: UsuarioAtividadeApi) => {
    const label = imovelLabel(rowData);
    if (!label) {
      return <span className="text-sm text-white/20">—</span>;
    }
    if (rowData.imovelId) {
      return (
        <Link
          href={`/dashboard/imoveis/edit?id=${rowData.imovelId}`}
          className="inline-flex items-center gap-2 text-sm text-cyan-400 no-underline transition-colors hover:text-cyan-300"
          title={label}
        >
          <Home size={14} className="shrink-0 text-cyan-400/60" />
          <span className="line-clamp-2">{label}</span>
          <ExternalLink size={12} className="shrink-0 opacity-60" />
        </Link>
      );
    }
    return <span className="line-clamp-2 text-sm text-white/60">{label}</span>;
  };

  const descricaoBodyTemplate = (rowData: UsuarioAtividadeApi) => {
    const desc = rowData.descricao?.trim();
    return desc ? (
      <span className="line-clamp-2 text-sm text-white/60" title={desc}>
        {desc}
      </span>
    ) : (
      "—"
    );
  };

  const entidadeBodyTemplate = (rowData: UsuarioAtividadeApi) => {
    const href = entidadeHref(rowData);
    const label = entidadeLabel(rowData);
    if (!href) {
      return <span className="text-sm text-white/20">—</span>;
    }
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm text-amber-400 no-underline transition-colors hover:text-amber-300"
        title={label}
      >
        <FileText size={14} className="shrink-0 text-amber-400/60" />
        <span className="font-mono tabular-nums tracking-tight">{label}</span>
        <ExternalLink size={12} className="shrink-0 opacity-60" />
      </Link>
    );
  };

  const actionBodyTemplate = (rowData: UsuarioAtividadeApi) => (
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

  const header = (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className={DASHBOARD_SEARCH_ICON_HEADER_CLASS} size={18} />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar descrição, e-mail, ação…"
            className={DASHBOARD_SEARCH_INPUT_HEADER_CLASS}
          />
        </div>
        <div className="text-sm text-white/40">
          <span className="font-bold text-white">{totalRecords}</span> registros encontrados
        </div>
      </div>

      <div className="flex flex-col flex-wrap items-stretch gap-3 md:flex-row md:items-center">
        <Dropdown
          value={modulo}
          options={[...MODULO_AUDITORIA_OPTIONS]}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => {
            setModulo(e.value);
            setPage(0);
          }}
          placeholder="Todos os módulos"
          className="w-full md:w-52"
          pt={{
            root: { className: "h-[42px] items-center rounded-full border-white/10 bg-white/5 px-2" },
            input: { className: "text-sm text-white/70" },
            trigger: { className: "text-white/30" },
            panel: { className: "rounded-2xl border-white/10 bg-[#1a1a1a] p-2 shadow-2xl" },
            item: ({ context }: { context?: { selected?: boolean } }) => ({
              className: cn(
                "mb-1 rounded-xl px-4 py-2.5 text-sm transition-all last:mb-0",
                context?.selected
                  ? "bg-blue-600 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              ),
            }),
          }}
        />
        <InputText
          type="date"
          value={dataInicio}
          onChange={(e) => {
            setDataInicio(e.target.value);
            setPage(0);
          }}
          placeholder="Data início"
          className="w-full rounded-full border-white/10 bg-white/5 py-3 px-4 text-sm text-white md:w-44 [color-scheme:dark]"
        />
        <InputText
          type="date"
          value={dataFim}
          onChange={(e) => {
            setDataFim(e.target.value);
            setPage(0);
          }}
          placeholder="Data fim"
          className="w-full rounded-full border-white/10 bg-white/5 py-3 px-4 text-sm text-white md:w-44 [color-scheme:dark]"
        />
      </div>
    </div>
  );

  if (!isApiConfigured()) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
        <p className="text-amber-200">
          A API não está configurada. Verifique suas variáveis de ambiente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
      <DataTable
        value={rows}
        lazy
        paginator
        first={params.page * pageSize}
        rows={pageSize}
        totalRecords={totalRecords}
        onPage={onPageChange}
        header={header}
        loading={loading}
        className="p-datatable-responsive-demo"
        emptyMessage="Nenhuma atividade encontrada."
        responsiveLayout="stack"
        breakpoint="960px"
        pt={TABLE_PT}
      >
        <Column header="Quando" body={quandoBodyTemplate} />
        <Column header="Utilizador" body={usuarioBodyTemplate} />
        <Column header="Módulo" body={moduloBodyTemplate} />
        <Column header="Ação" body={acaoBodyTemplate} />
        <Column header="Descrição" body={descricaoBodyTemplate} />
        <Column header="Imóvel" body={imovelBodyTemplate} />
        <Column header="Entidade" body={entidadeBodyTemplate} />
        <Column header="Ações" body={actionBodyTemplate} align="right" />
      </DataTable>

      <Menu model={actionItems} popup ref={menuRef} id="popup_menu_auditoria" pt={MENU_PT} />

      <Dialog
        visible={detalhe != null}
        onHide={() => setDetalhe(null)}
        header="Detalhe da atividade"
        className="w-full max-w-2xl"
        pt={{
          root: { className: "rounded-3xl border border-white/10 bg-[#0a1628]" },
          header: { className: "border-white/10 bg-transparent text-white" },
          content: { className: "bg-transparent text-white/80" },
        }}
      >
        {detalhe ? (
          <div className="flex flex-col gap-4 text-sm">
            <p>
              <span className="text-white/40">Ação:</span>{" "}
              <span className="font-mono text-amber-300">{detalhe.acao}</span>
            </p>
            {detalhe.requestPath ? (
              <p>
                <span className="text-white/40">Pedido:</span>{" "}
                <span className="font-mono">
                  {detalhe.httpMethod} {detalhe.requestPath}
                </span>
              </p>
            ) : null}
            {detalhe.ipOrigem ? (
              <p>
                <span className="text-white/40">IP:</span> {detalhe.ipOrigem}
              </p>
            ) : null}
            {detalhe.metadados && Object.keys(detalhe.metadados).length > 0 ? (
              <div>
                <p className="mb-2 text-white/40">Metadados</p>
                <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white/70">
                  {JSON.stringify(detalhe.metadados, null, 2)}
                </pre>
              </div>
            ) : null}
            {detalhe.alteracoes && Object.keys(detalhe.alteracoes).length > 0 ? (
              <div>
                <p className="mb-2 text-white/40">Alterações</p>
                <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white/70">
                  {JSON.stringify(detalhe.alteracoes, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
