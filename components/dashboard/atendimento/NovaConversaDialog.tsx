"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  atendimentoService,
  type AtendimentoBuscaItem,
} from "@/lib/atendimento-service";
import type { WhatsAppTemplateAprovado } from "@/lib/atendimento-chat-service";
import {
  fetchContratanteComTelefones,
  searchContratantes,
  type ContratanteOption,
} from "@/lib/contratante-service";
import { finService } from "@/lib/fin-service";
import { dashboardDialogPt } from "@/lib/dashboard-dialog";

type Props = {
  visible: boolean;
  onHide: () => void;
  templates: WhatsAppTemplateAprovado[];
  onEnviar: (args: {
    contratanteId?: number;
    telefone: string;
    templateId: string;
  }) => Promise<void>;
};

const FORM_LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-white/40";
const FORM_INPUT_CLASS =
  "w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white placeholder:text-white/30";

const DROPDOWN_PT = {
  input: { className: FORM_INPUT_CLASS },
  panel: { className: "!bg-[#0b1220] !border-white/10" },
};

function phonesFromCliente(c: {
  telefoneCelular1?: string | null;
  telefoneCelular2?: string | null;
}): string[] {
  const out: string[] = [];
  for (const p of [c.telefoneCelular1, c.telefoneCelular2]) {
    const t = p?.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function contratoResumo(item: AtendimentoBuscaItem): string {
  const parts = [
    item.numeroContrato || String(item.contratoId),
    item.empreendimento,
    item.quadra ? `Q${item.quadra}` : null,
    item.lote != null ? `L${item.lote}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function NovaConversaDialog({ visible, onHide, templates, onEnviar }: Props) {
  const [clientes, setClientes] = useState<ContratanteOption[]>([]);
  /** Objeto = cliente selecionado; string = texto a digitar na busca. */
  const [cliente, setCliente] = useState<ContratanteOption | string | undefined>(undefined);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [telefonesCliente, setTelefonesCliente] = useState<string[]>([]);
  const [telefone, setTelefone] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const searchSeqRef = useRef(0);

  const [contratoFiltro, setContratoFiltro] = useState("");
  const [empreendimento, setEmpreendimento] = useState<string | null>(null);
  const [quadra, setQuadra] = useState<string | null>(null);
  const [lote, setLote] = useState<number | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [lotes, setLotes] = useState<number[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(false);
  const [quadrasLoading, setQuadrasLoading] = useState(false);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [contratoMatch, setContratoMatch] = useState<AtendimentoBuscaItem | null>(null);
  const [buscandoContrato, setBuscandoContrato] = useState(false);
  const contratoBuscaSeqRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setCliente(undefined);
    setClientes([]);
    setTelefonesCliente([]);
    setTelefone("");
    setErro(null);
    setContratoFiltro("");
    setEmpreendimento(null);
    setQuadra(null);
    setLote(null);
    setQuadras([]);
    setLotes([]);
    setContratoMatch(null);
    const boas = templates.find((t) => t.nome === "mensagem_de_boas_vindas");
    setTemplateId(boas?.templateId ?? templates[0]?.templateId ?? "");

    setEmpreendimentosLoading(true);
    finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch(() => setEmpreendimentos([]))
      .finally(() => setEmpreendimentosLoading(false));
  }, [visible, templates]);

  useEffect(() => {
    if (!visible || !empreendimento) {
      setQuadras([]);
      return;
    }
    setQuadrasLoading(true);
    finService
      .listQuadrasImovel({ empreendimento }, { skipLoading: true })
      .then(setQuadras)
      .catch(() => setQuadras([]))
      .finally(() => setQuadrasLoading(false));
  }, [visible, empreendimento]);

  useEffect(() => {
    if (!visible || !empreendimento || !quadra) {
      setLotes([]);
      return;
    }
    setLotesLoading(true);
    finService
      .listLotesImovel({ empreendimento, quadra }, { skipLoading: true })
      .then(setLotes)
      .catch(() => setLotes([]))
      .finally(() => setLotesLoading(false));
  }, [visible, empreendimento, quadra]);

  const aplicarContrato = useCallback(async (item: AtendimentoBuscaItem) => {
    setContratoMatch(item);
    setContratoFiltro(item.numeroContrato || String(item.contratoId));
    setEmpreendimento(item.empreendimento || null);
    setQuadra(item.quadra);
    setLote(item.lote);
    setErro(null);

    const opt: ContratanteOption = {
      id: String(item.contratanteId),
      nome: item.contratanteNome,
      cpf: item.cpf,
    };
    setCliente(opt);

    const full = await fetchContratanteComTelefones(item.contratanteId);
    const phones = full ? phonesFromCliente(full) : [];
    if (item.celular?.trim() && !phones.includes(item.celular.trim())) {
      phones.unshift(item.celular.trim());
    }
    setTelefonesCliente(phones);
    if (phones.length === 1) setTelefone(phones[0]);
    else if (phones.length === 0) {
      setTelefone(item.celular?.trim() ?? "");
      if (!item.celular?.trim()) {
        setErro("Cliente sem celular — digite o telefone WhatsApp abaixo");
      }
    } else {
      setTelefone("");
    }
  }, []);

  /** Cancela busca em voo e remove o vínculo contrato↔filtros (evita o debounce reaplicar). */
  function invalidarMatchContrato() {
    contratoBuscaSeqRef.current += 1;
    setBuscandoContrato(false);
    setContratoMatch(null);
    setContratoFiltro("");
    setErro(null);
  }

  function onEmpreendimentoChange(value: string | null | undefined) {
    const next = value == null || value === "" ? null : value;
    if (!next) {
      invalidarMatchContrato();
      setEmpreendimento(null);
      setQuadra(null);
      setLote(null);
      return;
    }
    invalidarMatchContrato();
    setEmpreendimento(next);
    setQuadra(null);
    setLote(null);
  }

  function onQuadraChange(value: string | null | undefined) {
    const next = value == null || value === "" ? null : value;
    if (!next) {
      invalidarMatchContrato();
      setQuadra(null);
      setLote(null);
      return;
    }
    invalidarMatchContrato();
    setQuadra(next);
    setLote(null);
  }

  function onLoteChange(value: number | null | undefined) {
    const next = value == null || (typeof value === "number" && Number.isNaN(value)) ? null : value;
    if (next == null) {
      invalidarMatchContrato();
      setLote(null);
      return;
    }
    // Mantém emp/quadra; limpa só o nº do contrato até o efeito de lote reaplicar o match
    contratoBuscaSeqRef.current += 1;
    setBuscandoContrato(false);
    setContratoMatch(null);
    setContratoFiltro("");
    setErro(null);
    setLote(next);
  }

  const buscarPorFiltros = useCallback(
    async (filters: {
      contrato?: string;
      empreendimentos?: string[];
      quadras?: string[];
      lotes?: number[];
    }) => {
      const hasAny =
        Boolean(filters.contrato?.trim()) ||
        Boolean(filters.empreendimentos?.length) ||
        Boolean(filters.quadras?.length) ||
        Boolean(filters.lotes?.length);
      if (!hasAny) {
        setContratoMatch(null);
        return;
      }
      const seq = ++contratoBuscaSeqRef.current;
      setBuscandoContrato(true);
      try {
        const page = await atendimentoService.buscar(0, 8, filters, undefined, {
          skipLoading: true,
        });
        if (seq !== contratoBuscaSeqRef.current) return;
        const items = page.content ?? [];
        if (items.length === 1) {
          await aplicarContrato(items[0]);
        } else if (items.length === 0) {
          setContratoMatch(null);
          setErro("Nenhum contrato encontrado para os filtros informados");
        } else {
          setContratoMatch(null);
          setErro(
            `Vários contratos encontrados (${items.length}). Refine por quadra/lote ou número do contrato.`,
          );
        }
      } catch (e) {
        if (seq !== contratoBuscaSeqRef.current) return;
        setContratoMatch(null);
        setErro(e instanceof Error ? e.message : "Falha ao buscar contrato");
      } finally {
        if (seq === contratoBuscaSeqRef.current) setBuscandoContrato(false);
      }
    },
    [aplicarContrato],
  );

  useEffect(() => {
    if (!visible || !empreendimento || !quadra || lote == null) return;
    void buscarPorFiltros({
      empreendimentos: [empreendimento],
      quadras: [quadra],
      lotes: [lote],
    });
  }, [visible, empreendimento, quadra, lote, buscarPorFiltros]);

  useEffect(() => {
    if (!visible) return;
    const term = contratoFiltro.trim();
    if (term.length < 2) return;
    // Evita re-buscar quando o match já preencheu o campo com o mesmo número
    if (
      contratoMatch &&
      (contratoMatch.numeroContrato === term || String(contratoMatch.contratoId) === term)
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      void buscarPorFiltros({ contrato: term });
    }, 450);
    return () => window.clearTimeout(t);
  }, [visible, contratoFiltro, contratoMatch, buscarPorFiltros]);

  const buscarClientes = useCallback(async (e: AutoCompleteCompleteEvent) => {
    const term = (e.query ?? "").trim();
    if (term.length < 2) {
      setClientes([]);
      return;
    }
    const seq = ++searchSeqRef.current;
    setClientesLoading(true);
    try {
      const found = await searchContratantes(term);
      if (seq === searchSeqRef.current) setClientes(found);
    } catch {
      if (seq === searchSeqRef.current) setClientes([]);
    } finally {
      if (seq === searchSeqRef.current) setClientesLoading(false);
    }
  }, []);

  async function onSelectCliente(opt: ContratanteOption) {
    setCliente(opt);
    setTelefonesCliente([]);
    setTelefone("");
    setContratoMatch(null);
    setErro(null);
    const id = Number(opt.id);
    if (!Number.isFinite(id)) return;
    const full = await fetchContratanteComTelefones(id);
    if (!full) {
      setErro("Não foi possível carregar o cliente");
      return;
    }
    const phones = phonesFromCliente(full);
    setTelefonesCliente(phones);
    if (phones.length === 1) setTelefone(phones[0]);
    else if (phones.length === 0) {
      setErro("Cliente sem celular — digite o telefone WhatsApp abaixo");
    }
  }

  async function handleEnviar() {
    const tel = telefone.trim();
    if (!tel) {
      setErro("Informe o telefone WhatsApp");
      return;
    }
    if (!templateId) {
      setErro("Selecione um template");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const selected =
        cliente && typeof cliente === "object" && "id" in cliente ? cliente : undefined;
      const contratanteId = selected?.id ? Number(selected.id) : undefined;
      await onEnviar({
        contratanteId: Number.isFinite(contratanteId) ? contratanteId : undefined,
        telefone: tel,
        templateId,
      });
      onHide();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao iniciar conversa");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DashboardDialog
      header="Nova conversa"
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl"
      pt={dashboardDialogPt({
        header: {
          className:
            "border-b border-white/[0.06] bg-transparent px-5 py-4 font-semibold text-white",
        },
        content: { className: "bg-transparent px-5 py-4 overflow-visible" },
        footer: { className: "border-t border-white/[0.06] bg-transparent px-5 py-4" },
      })}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onHide}
            disabled={enviando}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleEnviar()}
            disabled={enviando || !templateId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-50"
          >
            <i className={`pi ${enviando ? "pi-spin pi-spinner" : "pi-send"} text-xs`} />
            {enviando ? "A enviar…" : "Enviar template"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-white/85">
        <p className="text-[12px] text-white/45">
          Localize pelo contrato/lote ou busque o cliente, informe o telefone e envie um
          template aprovado para iniciar a conversa.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className={FORM_LABEL_CLASS}>Contrato</span>
            <InputText
              value={contratoFiltro}
              onChange={(e) => {
                setContratoFiltro(e.target.value);
                setContratoMatch(null);
              }}
              placeholder="Número do contrato"
              className={FORM_INPUT_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className={FORM_LABEL_CLASS}>Empreendimento</span>
            <Dropdown
              value={empreendimento}
              options={empreendimentos.map((emp) => ({ label: emp, value: emp }))}
              onChange={(e) => onEmpreendimentoChange(e.value as string | null)}
              placeholder="Selecione"
              filter
              showClear
              disabled={empreendimentosLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className={FORM_LABEL_CLASS}>Quadra</span>
            <Dropdown
              value={quadra}
              options={quadras.map((q) => ({ label: `Quadra ${q}`, value: q }))}
              onChange={(e) => onQuadraChange(e.value as string | null)}
              placeholder={empreendimento ? "Selecione" : "Empreendimento primeiro"}
              showClear
              disabled={!empreendimento || quadrasLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className={FORM_LABEL_CLASS}>Lote</span>
            <Dropdown
              value={lote}
              options={lotes.map((n) => ({ label: `Lote ${n}`, value: n }))}
              onChange={(e) => onLoteChange(e.value as number | null)}
              placeholder={
                !empreendimento
                  ? "Empreendimento primeiro"
                  : !quadra
                    ? "Quadra primeiro"
                    : "Selecione"
              }
              showClear
              disabled={!quadra || lotesLoading}
              className="w-full"
              pt={DROPDOWN_PT}
            />
          </div>
        </div>

        {buscandoContrato ? (
          <span className="text-[10px] text-white/35">A localizar contrato…</span>
        ) : null}
        {contratoMatch ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
            {contratoResumo(contratoMatch)} · {contratoMatch.contratanteNome}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className={FORM_LABEL_CLASS}>Cliente</span>
          <AutoComplete
            value={cliente}
            suggestions={clientes}
            completeMethod={buscarClientes}
            field="nome"
            dropdown
            forceSelection={false}
            delay={280}
            minLength={2}
            placeholder="Buscar por nome, CPF ou e-mail…"
            className="w-full"
            inputClassName="w-full !bg-black/30 !border-white/10 !text-white"
            panelClassName="!bg-[#0b1220] !border-white/10"
            onChange={(e) => {
              // Com forceSelection=false o PrimeReact emite string ao digitar;
              // o tipo genérico do AutoComplete só reflete o item (objeto).
              const v = e.value as ContratanteOption | string | null | undefined;
              if (v && typeof v === "object" && "id" in v) {
                void onSelectCliente(v);
                return;
              }
              // Texto digitado: manter no input (não zerar — isso “bloqueava” a digitação)
              if (typeof v === "string") {
                setCliente(v);
                if (!v.trim()) setTelefonesCliente([]);
                return;
              }
              setCliente(undefined);
              setTelefonesCliente([]);
            }}
            itemTemplate={(c: ContratanteOption) => (
              <div className="flex flex-col py-0.5">
                <span className="text-sm text-white/90">{c.nome}</span>
                {c.cpf ? (
                  <span className="font-mono text-[10px] text-white/40">{c.cpf}</span>
                ) : null}
              </div>
            )}
          />
          {clientesLoading ? (
            <span className="text-[10px] text-white/35">A procurar…</span>
          ) : null}
        </div>

        {telefonesCliente.length > 1 ? (
          <label className="flex flex-col gap-1">
            <span className={FORM_LABEL_CLASS}>Celular do cadastro</span>
            <select
              className={FORM_INPUT_CLASS}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            >
              <option value="">Selecione…</option>
              {telefonesCliente.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className={FORM_LABEL_CLASS}>Telefone WhatsApp</span>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Ex.: 85999999999 ou 5585999999999"
            className={`${FORM_INPUT_CLASS} font-mono focus:border-blue-400/40 focus:outline-none`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={FORM_LABEL_CLASS}>Template</span>
          <select
            className={FORM_INPUT_CLASS}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={templates.length === 0}
          >
            {templates.length === 0 ? (
              <option value="">Nenhum template aprovado</option>
            ) : (
              templates.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.nome}
                </option>
              ))
            )}
          </select>
        </label>

        {erro ? (
          <div className="whitespace-pre-wrap rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {erro}
          </div>
        ) : null}
      </div>
    </DashboardDialog>
  );
}
