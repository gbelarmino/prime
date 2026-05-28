"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { toast } from "sonner";
import {
  Bell,
  Flame,
  GripVertical,
  Kanban,
  Loader2,
  Mail,
  MapPin,
  ClipboardList,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Snowflake,
  Thermometer,
  UserCheck,
  UserCog,
} from "lucide-react";
import {
  converterLead,
  createLead,
  fetchFunilCardAcoes,
  fetchKanban,
  fetchLeadInteracoes,
  type FunilCardAcaoDto,
  moverLeadEtapa,
  registrarLeadInteracao,
  type KanbanBoardDto,
  type KanbanColumnDto,
  type LeadAtividadeDto,
  type LeadDto,
  type LeadInteracaoTipo,
  type LeadTemperatura,
} from "@/lib/crm-service";
import { finService } from "@/lib/fin-service";
import { cn } from "@/lib/utils";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import { CrmLeadQualificacaoDialog } from "./CrmLeadQualificacaoDialog";
import { CrmLeadAtribuicaoDialog } from "./CrmLeadAtribuicaoDialog";
import { isValidCpf, maskCpf } from "@/lib/format-cpf";
import { maskPhone } from "@/lib/format-phone";
import { useCrmKanbanRealtime } from "@/hooks/use-crm-kanban-realtime";
import type { CrmKanbanWsEvent } from "@/lib/crm-realtime";
import {
  filterCorretoresByImobiliaria,
  loadCampanhasAtivas,
  loadCorretoresOptions,
  loadImobiliariasOptions,
  type CampanhaOption,
  type CorretorOption,
  type ImobiliariaOption,
} from "@/lib/crm-assignments";
import { combinePhoneWithDdi } from "@/lib/validations/crm-lead-qualificacao";
import {
  CRM_QUAL_DROPDOWN_PT,
  CRM_QUAL_INPUT_CLASS,
  CRM_QUAL_LABEL_CLASS,
} from "@/lib/crm-qualificacao-form-styles";
import {
  filterFunilCardAcoesForLead,
  funilCardAcaoIcon,
  type FunilCardAcaoHandlers,
} from "@/lib/crm-funil-card-acoes";

const TEMPERATURA_OPTIONS: { label: string; value: LeadTemperatura }[] = [
  { label: "Frio", value: "FRIO" },
  { label: "Morno", value: "MORNO" },
  { label: "Quente", value: "QUENTE" },
];

const INTERACAO_TIPO_OPTIONS: { label: string; value: LeadInteracaoTipo }[] = [
  { label: "Nota", value: "NOTA" },
  { label: "Ligação", value: "LIGACAO" },
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "E-mail", value: "EMAIL" },
  { label: "Visita", value: "VISITA" },
];

const TEMPERATURA_CARD_STYLE: Record<
  LeadTemperatura,
  { card: string; active: string; accent: string }
> = {
  FRIO: {
    card: "border-cyan-500/30 bg-cyan-950/40",
    active: "active:border-cyan-400/50",
    accent: "border-l-cyan-400",
  },
  MORNO: {
    card: "border-orange-500/45 bg-orange-500/[0.12] shadow-[inset_0_0_0_1px_rgba(251,146,60,0.12)]",
    active: "active:border-orange-400/70",
    accent: "border-l-orange-400",
  },
  QUENTE: {
    card: "border-rose-500/35 bg-rose-950/40",
    active: "active:border-rose-400/50",
    accent: "border-l-rose-400",
  },
};

const CRM_DIALOG_PT = {
  root: { className: "border border-white/10 bg-[#071C33] shadow-2xl rounded-2xl overflow-hidden" },
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "px-6 py-5 text-white/80" },
  closeButton: { className: "text-white/40 hover:text-white" },
};

function filterKanbanByTemperaturas(
  board: KanbanBoardDto,
  temperaturas: LeadTemperatura[],
): KanbanBoardDto {
  if (temperaturas.length === 0) return board;
  const colunas = board.colunas.map((col) => ({
    ...col,
    leads: col.leads.filter((l) => temperaturas.includes(l.temperatura)),
  }));
  const totalLeads = colunas.reduce((sum, col) => sum + col.leads.length, 0);
  return { ...board, colunas, totalLeads };
}

type KanbanDropTarget = { etapaId: number; index: number };

type LeadOrderUpdate = { id: number; funilEtapaId: number; ordemKanban: number };

/** Insere o lead na coluna de destino e renumera ordemKanban (0…n). Devolve updates para persistir. */
function applyLeadInsertInBoard(
  board: KanbanBoardDto,
  leadId: number,
  targetEtapaId: number,
  insertIndex: number,
): { board: KanbanBoardDto; updates: LeadOrderUpdate[] } {
  let movedLead: LeadDto | undefined;
  const colunasSemLead = board.colunas.map((col) => ({
    ...col,
    leads: col.leads.filter((l) => {
      if (l.id === leadId) {
        movedLead = l;
        return false;
      }
      return true;
    }),
  }));
  if (!movedLead) return { board, updates: [] };

  const targetMeta = board.colunas.find((c) => c.etapaId === targetEtapaId);
  if (!targetMeta) return { board, updates: [] };

  const destCol = colunasSemLead.find((c) => c.etapaId === targetEtapaId);
  if (!destCol) return { board, updates: [] };

  const reordered = [...destCol.leads];
  const idx = Math.max(0, Math.min(insertIndex, reordered.length));
  const lead: LeadDto = {
    ...movedLead,
    funilEtapaId: targetEtapaId,
    funilEtapaNome: targetMeta.nome,
    funilEtapaCodigo: targetMeta.codigo,
    ordemKanban: idx,
  };
  reordered.splice(idx, 0, lead);
  const withOrdem = reordered.map((l, i) => ({ ...l, ordemKanban: i }));

  const updates: LeadOrderUpdate[] = withOrdem.map((l) => ({
    id: l.id,
    funilEtapaId: l.funilEtapaId,
    ordemKanban: l.ordemKanban,
  }));

  return {
    board: {
      totalLeads: board.totalLeads,
      colunas: colunasSemLead.map((col) =>
        col.etapaId === targetEtapaId ? { ...col, leads: withOrdem } : col,
      ),
    },
    updates,
  };
}

function prependLeadInBoard(board: KanbanBoardDto, lead: LeadDto): KanbanBoardDto {
  return {
    totalLeads: board.totalLeads + 1,
    colunas: board.colunas.map((col) =>
      col.etapaId === lead.funilEtapaId ? { ...col, leads: [lead, ...col.leads] } : col,
    ),
  };
}

function patchLeadInBoard(board: KanbanBoardDto, updated: LeadDto): KanbanBoardDto {
  return {
    ...board,
    colunas: board.colunas.map((col) => ({
      ...col,
      leads: col.leads.map((l) => (l.id === updated.id ? updated : l)),
    })),
  };
}

function relocateLeadInBoard(board: KanbanBoardDto, updated: LeadDto): KanbanBoardDto {
  const colunas = board.colunas.map((col) => ({
    ...col,
    leads: col.leads.filter((l) => l.id !== updated.id),
  }));
  return {
    totalLeads: board.totalLeads,
    colunas: colunas.map((col) =>
      col.etapaId === updated.funilEtapaId ? { ...col, leads: [...col.leads, updated] } : col,
    ),
  };
}

function normalizeCpfDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function FunilLocalSpinner({ label = "Sincronizando funil" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 animate-spin text-blue-400/90" strokeWidth={2} aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">
        {label}
      </span>
    </div>
  );
}

export function CrmFunilKanban() {
  const [board, setBoard] = useState<KanbanBoardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empreendimento, setEmpreendimento] = useState<string | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [empreendimentosLoading, setEmpreendimentosLoading] = useState(false);
  const [temperatura, setTemperatura] = useState<LeadTemperatura>("FRIO");
  const [filtroTemperaturas, setFiltroTemperaturas] = useState<LeadTemperatura[]>([]);
  const [cardAcoes, setCardAcoes] = useState<FunilCardAcaoDto[]>([]);
  const [dragLeadId, setDragLeadId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanDropTarget | null>(null);
  const dropTargetRef = useRef<KanbanDropTarget | null>(null);

  const setDropTargetSync = useCallback((target: KanbanDropTarget | null) => {
    dropTargetRef.current = target;
    setDropTarget(target);
  }, []);
  const [perdaOpen, setPerdaOpen] = useState(false);
  const [perdaLeadId, setPerdaLeadId] = useState<number | null>(null);
  const [perdaEtapaId, setPerdaEtapaId] = useState<number | null>(null);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [converterOpen, setConverterOpen] = useState(false);
  const [converterLeadId, setConverterLeadId] = useState<number | null>(null);
  const [converterLeadNome, setConverterLeadNome] = useState("");
  const [cpfConverter, setCpfConverter] = useState("");
  const [interacaoOpen, setInteracaoOpen] = useState(false);
  const [interacaoLead, setInteracaoLead] = useState<LeadDto | null>(null);
  const [interacoes, setInteracoes] = useState<LeadAtividadeDto[]>([]);
  const [interacoesLoading, setInteracoesLoading] = useState(false);
  const [interacaoTipo, setInteracaoTipo] = useState<LeadInteracaoTipo>("NOTA");
  const [interacaoDescricao, setInteracaoDescricao] = useState("");
  const [interacaoTemperatura, setInteracaoTemperatura] = useState<LeadTemperatura>("FRIO");
  const [savingInteracao, setSavingInteracao] = useState(false);
  const [qualificacaoOpen, setQualificacaoOpen] = useState(false);
  const [qualificacaoLead, setQualificacaoLead] = useState<LeadDto | null>(null);
  const [atribuicaoOpen, setAtribuicaoOpen] = useState(false);
  const [atribuicaoLead, setAtribuicaoLead] = useState<LeadDto | null>(null);
  const [ddi, setDdi] = useState("+55");
  const [campanhaId, setCampanhaId] = useState<number | null>(null);
  const [imobiliariaId, setImobiliariaId] = useState<number | null>(null);
  const [corretorId, setCorretorId] = useState<number | null>(null);
  const [campanhas, setCampanhas] = useState<CampanhaOption[]>([]);
  const [imobiliarias, setImobiliarias] = useState<ImobiliariaOption[]>([]);
  const [corretores, setCorretores] = useState<CorretorOption[]>([]);
  const [assignmentOptsLoading, setAssignmentOptsLoading] = useState(false);

  const corretoresNovoFiltrados = useMemo(
    () => filterCorretoresByImobiliaria(corretores, imobiliariaId),
    [corretores, imobiliariaId],
  );

  const campanhaNomeById = useMemo(() => {
    const map = new Map<number, string>();
    campanhas.forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [campanhas]);

  const corretorNomeById = useMemo(() => {
    const map = new Map<number, string>();
    corretores.forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [corretores]);

  const displayBoard = useMemo(
    () => (board ? filterKanbanByTemperaturas(board, filtroTemperaturas) : null),
    [board, filtroTemperaturas],
  );
  const filtroTemperaturaAtivo = filtroTemperaturas.length > 0;

  const loadCardAcoes = useCallback(async () => {
    try {
      const acoes = await fetchFunilCardAcoes();
      setCardAcoes(acoes);
    } catch {
      setCardAcoes([]);
    }
  }, []);

  const load = useCallback(async (opts?: { initial?: boolean; background?: boolean }) => {
    if (opts?.initial) setLoading(true);
    else if (opts?.background) setSyncing(true);
    try {
      const [data] = await Promise.all([
        fetchKanban(),
        loadCardAcoes().then(() => undefined),
      ]);
      setBoard(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar funil.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [loadCardAcoes]);

  useEffect(() => {
    void load({ initial: true });
  }, [load]);

  const kanbanRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kanbanMutationLockRef = useRef(0);
  const pendingKanbanRefreshRef = useRef(false);
  const dragLeadIdRef = useRef(dragLeadId);
  const interacaoOpenRef = useRef(interacaoOpen);
  const interacaoLeadRef = useRef(interacaoLead);
  dragLeadIdRef.current = dragLeadId;
  interacaoOpenRef.current = interacaoOpen;
  interacaoLeadRef.current = interacaoLead;

  const flushKanbanRefreshFromRealtime = useCallback(() => {
    if (kanbanMutationLockRef.current > 0 || dragLeadIdRef.current != null) {
      pendingKanbanRefreshRef.current = true;
      return;
    }
    if (kanbanRefreshDebounceRef.current) {
      clearTimeout(kanbanRefreshDebounceRef.current);
    }
    kanbanRefreshDebounceRef.current = setTimeout(() => {
      if (kanbanMutationLockRef.current > 0 || dragLeadIdRef.current != null) {
        pendingKanbanRefreshRef.current = true;
        return;
      }
      void load({ background: true });
    }, 400);
  }, [load]);

  const beginKanbanMutation = useCallback(() => {
    kanbanMutationLockRef.current += 1;
  }, []);

  const endKanbanMutation = useCallback(() => {
    kanbanMutationLockRef.current = Math.max(0, kanbanMutationLockRef.current - 1);
    if (
      kanbanMutationLockRef.current === 0 &&
      pendingKanbanRefreshRef.current &&
      dragLeadIdRef.current == null
    ) {
      pendingKanbanRefreshRef.current = false;
      flushKanbanRefreshFromRealtime();
    }
  }, [flushKanbanRefreshFromRealtime]);

  const scheduleKanbanRefresh = flushKanbanRefreshFromRealtime;

  const onKanbanRealtime = useCallback(
    (event: CrmKanbanWsEvent) => {
      scheduleKanbanRefresh();
      const lead = interacaoLeadRef.current;
      if (
        interacaoOpenRef.current &&
        lead &&
        event.leadId != null &&
        event.leadId === lead.id
      ) {
        void fetchLeadInteracoes(lead.id)
          .then(setInteracoes)
          .catch(() => {
            /* painel de interações opcional */
          });
      }
    },
    [scheduleKanbanRefresh],
  );

  useCrmKanbanRealtime(onKanbanRealtime);

  useEffect(() => {
    return () => {
      if (kanbanRefreshDebounceRef.current) {
        clearTimeout(kanbanRefreshDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setAssignmentOptsLoading(true);
    void Promise.all([loadCampanhasAtivas(), loadImobiliariasOptions(), loadCorretoresOptions()])
      .then(([c, i, r]) => {
        setCampanhas(c);
        setImobiliarias(i);
        setCorretores(r);
      })
      .catch(() => {
        /* labels de atribuição opcionais no card */
      })
      .finally(() => setAssignmentOptsLoading(false));
  }, []);

  useEffect(() => {
    if (corretorId == null) return;
    if (!corretoresNovoFiltrados.some((c) => c.id === corretorId)) {
      setCorretorId(null);
    }
  }, [corretorId, corretoresNovoFiltrados]);

  useEffect(() => {
    if (!novoOpen) return;
    setEmpreendimentosLoading(true);
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then((lista) => {
        setEmpreendimentos(lista);
        if (lista.length === 1) {
          setEmpreendimento(lista[0]);
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar empreendimentos.");
        setEmpreendimentos([]);
      })
      .finally(() => setEmpreendimentosLoading(false));
  }, [novoOpen]);

  function resetNovoLeadForm() {
    setNome("");
    setEmail("");
    setTelefone("");
    setDdi("+55");
    setEmpreendimento(null);
    setTemperatura("FRIO");
    setCampanhaId(null);
    setImobiliariaId(null);
    setCorretorId(null);
  }

  function abrirAtribuicao(lead: LeadDto) {
    setAtribuicaoLead(lead);
    setAtribuicaoOpen(true);
  }

  async function handleDrop() {
    const target = dropTargetRef.current;
    setDropTargetSync(null);
    if (dragLeadId == null || target == null || !board) {
      setDragLeadId(null);
      return;
    }
    const coluna = board.colunas.find((c) => c.etapaId === target.etapaId);
    const lead = board.colunas.flatMap((c) => c.leads).find((l) => l.id === dragLeadId);
    if (!lead || !coluna) {
      setDragLeadId(null);
      return;
    }

    const fromIndex = coluna.leads.findIndex((l) => l.id === lead.id);
    const sameColumn = lead.funilEtapaId === coluna.etapaId;
    if (sameColumn && fromIndex >= 0 && isKanbanOrderUnchanged(coluna.leads, fromIndex, target.index)) {
      setDragLeadId(null);
      return;
    }

    if (coluna.finalPerdido && !sameColumn) {
      setPerdaLeadId(lead.id);
      setPerdaEtapaId(coluna.etapaId);
      setMotivoPerda("");
      setPerdaOpen(true);
      setDragLeadId(null);
      return;
    }

    const snapshot = board;
    const { board: nextBoard, updates } = applyLeadInsertInBoard(
      board,
      lead.id,
      coluna.etapaId,
      target.index,
    );
    if (updates.length === 0) {
      setDragLeadId(null);
      return;
    }

    setBoard(nextBoard);
    setDragLeadId(null);
    beginKanbanMutation();
    try {
      for (const u of updates) {
        await moverLeadEtapa(u.id, {
          funilEtapaId: u.funilEtapaId,
          ordemKanban: u.ordemKanban,
        });
      }
    } catch (e) {
      setBoard(snapshot);
      toast.error(e instanceof Error ? e.message : "Não foi possível ordenar o lead.");
    } finally {
      endKanbanMutation();
    }
  }

  async function confirmarPerda() {
    if (perdaLeadId == null || perdaEtapaId == null || !motivoPerda.trim()) {
      toast.error("Informe o motivo da perda.");
      return;
    }
    const colunaPerda = board?.colunas.find((c) => c.etapaId === perdaEtapaId);
    if (!board || !colunaPerda) return;

    const snapshot = board;
    const { board: boardPerda } = applyLeadInsertInBoard(
      board,
      perdaLeadId,
      perdaEtapaId,
      colunaPerda.leads.length,
    );
    setBoard(boardPerda);
    setPerdaOpen(false);
    setSaving(true);
    beginKanbanMutation();
    try {
      const updated = await moverLeadEtapa(perdaLeadId, {
        funilEtapaId: perdaEtapaId,
        motivoPerda: motivoPerda.trim(),
      });
      setBoard((current) => (current ? relocateLeadInBoard(current, updated) : current));
    } catch (e) {
      setBoard(snapshot);
      setPerdaOpen(true);
      toast.error(e instanceof Error ? e.message : "Erro ao registrar perda.");
    } finally {
      endKanbanMutation();
      setSaving(false);
      setPerdaLeadId(null);
      setPerdaEtapaId(null);
      setMotivoPerda("");
    }
  }

  async function salvarNovo() {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    beginKanbanMutation();
    try {
      const telefoneCompleto =
        telefone.trim() && ddi.trim() ? combinePhoneWithDdi(ddi, telefone) : undefined;
      const created = await createLead({
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefoneCompleto,
        empreendimentoInteresse: empreendimento?.trim() || undefined,
        temperatura,
        origem: "MANUAL",
        campanhaId: campanhaId ?? undefined,
        corretorId: corretorId ?? undefined,
        imobiliariaId: imobiliariaId ?? undefined,
      });
      setBoard((current) => (current ? prependLeadInBoard(current, created) : current));
      setNovoOpen(false);
      resetNovoLeadForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar lead.");
    } finally {
      endKanbanMutation();
      setSaving(false);
    }
  }

  function abrirConverter(lead: LeadDto) {
    setConverterLeadId(lead.id);
    setConverterLeadNome(lead.nome);
    setCpfConverter(lead.cpf ? formatCpfDisplay(lead.cpf) : "");
    setConverterOpen(true);
  }

  async function carregarInteracoes(leadId: number) {
    setInteracoesLoading(true);
    try {
      const lista = await fetchLeadInteracoes(leadId);
      setInteracoes(lista);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar interações.");
      setInteracoes([]);
    } finally {
      setInteracoesLoading(false);
    }
  }

  function abrirQualificacao(lead: LeadDto) {
    setQualificacaoLead(lead);
    setQualificacaoOpen(true);
  }

  function abrirInteracoes(lead: LeadDto) {
    setInteracaoLead(lead);
    setInteracaoTipo("NOTA");
    setInteracaoDescricao("");
    setInteracaoTemperatura(lead.temperatura);
    setInteracaoOpen(true);
    void carregarInteracoes(lead.id);
  }

  async function salvarInteracao() {
    if (!interacaoLead || !board) return;
    if (!interacaoDescricao.trim()) {
      toast.error("Descreva a interação com o lead.");
      return;
    }
    setSavingInteracao(true);
    beginKanbanMutation();
    try {
      const updated = await registrarLeadInteracao(interacaoLead.id, {
        tipo: interacaoTipo,
        descricao: interacaoDescricao.trim(),
        temperatura: interacaoTemperatura,
      });
      setBoard(patchLeadInBoard(board, updated));
      setInteracaoDescricao("");
      toast.success("Interação registrada.");
      setInteracaoOpen(false);
      setInteracaoLead(null);
      setInteracoes([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar interação.");
    } finally {
      endKanbanMutation();
      setSavingInteracao(false);
    }
  }

  async function confirmarConverter() {
    if (converterLeadId == null || !board) return;
    if (!isValidCpf(cpfConverter)) {
      toast.error("Informe um CPF válido.");
      return;
    }
    const cpfDigits = normalizeCpfDigits(cpfConverter);
    const snapshot = board;
    setConverterOpen(false);
    setSaving(true);
    beginKanbanMutation();
    try {
      const updated = await converterLead(converterLeadId, cpfDigits);
      setBoard(relocateLeadInBoard(snapshot, updated));
      toast.success(
        updated.contratanteId != null
          ? `Cliente vinculado (#${updated.contratanteId}).`
          : "Lead convertido em cliente.",
      );
    } catch (e) {
      setBoard(snapshot);
      setConverterOpen(true);
      toast.error(e instanceof Error ? e.message : "Não foi possível converter o lead.");
    } finally {
      endKanbanMutation();
      setSaving(false);
      setConverterLeadId(null);
      setConverterLeadNome("");
      setCpfConverter("");
    }
  }

  const etapasAtivas = displayBoard?.colunas.length ?? 0;

  const cardAcaoHandlers: FunilCardAcaoHandlers = {
    ATRIBUICAO: abrirAtribuicao,
    QUALIFICACAO: abrirQualificacao,
    INTERACAO: abrirInteracoes,
    CONVERTER_CLIENTE: abrirConverter,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Cabeçalho */}
      <header className="mb-6 shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
              <Kanban size={14} aria-hidden />
              CRM · Pipeline
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-tight text-white md:text-4xl">
              Funil de vendas
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
              Arraste os cards entre etapas. Leads perdidos exigem motivo registrado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/crm/funil/gatilhos"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              title="Gatilhos WhatsApp do funil"
            >
              <Bell size={16} aria-hidden />
              <span className="hidden sm:inline">Gatilhos</span>
            </Link>
            <Link
              href="/dashboard/crm/funil/acoes"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              title="Configurar ações dos cards"
            >
              <Settings2 size={16} aria-hidden />
              <span className="hidden sm:inline">Ações</span>
            </Link>
            <Button
              type="button"
              icon={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
              label="Atualizar"
              severity="secondary"
              outlined
              disabled={loading || syncing}
              onClick={() => void load({ background: true })}
              className="!border-white/15 !text-white/70 hover:!bg-white/5"
            />
            <Button
              type="button"
              icon={<Plus size={16} />}
              label="Novo lead"
              onClick={() => setNovoOpen(true)}
              className="!shadow-lg !shadow-blue-600/25"
            />
          </div>
        </div>

        {board ? (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-[12rem] max-w-xs sm:w-auto">
                <label
                  htmlFor="funil-filtro-temperatura"
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.3em] text-white/35"
                >
                  Temperatura
                </label>
                <MultiSelect
                  inputId="funil-filtro-temperatura"
                  value={filtroTemperaturas}
                  options={TEMPERATURA_OPTIONS}
                  optionLabel="label"
                  optionValue="value"
                  onChange={(e) => setFiltroTemperaturas(e.value ?? [])}
                  placeholder="Todas"
                  display="chip"
                  showClear
                  maxSelectedLabels={3}
                  className="w-full"
                  pt={dashboardMultiSelectPt()}
                />
              </div>
              <StatPill
                label="Leads no funil"
                value={
                  filtroTemperaturaAtivo && displayBoard
                    ? `${displayBoard.totalLeads} / ${board.totalLeads}`
                    : String(board.totalLeads)
                }
                accent
              />
              <StatPill label="Etapas" value={String(etapasAtivas)} />
            </div>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Leads por etapa">
              {(displayBoard ?? board).colunas.map((col) => (
                <EtapaMetricChip key={col.etapaId} coluna={col} />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {/* Área do board */}
      <div className="relative min-h-0 flex-1 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-1">
        {loading && !board ? (
          <FunilLocalSpinner label="Montando colunas do funil" />
        ) : (
          <div className="h-full min-h-[460px] overflow-x-auto overflow-y-hidden pb-3 pt-2">
            <div className="flex h-full min-h-[440px] gap-4 px-2">
              {displayBoard?.colunas.map((col) => (
                <KanbanColumn
                  key={col.etapaId}
                  coluna={col}
                  isDragging={dragLeadId != null}
                  dragLeadId={dragLeadId}
                  dropTarget={dropTarget}
                  onDragStart={setDragLeadId}
                  onDragEnterColumn={() =>
                    setDropTargetSync({
                      etapaId: col.etapaId,
                      index: resolveAppendIndex(col, dragLeadId),
                    })
                  }
                  onDragLeaveColumn={() => {
                    const t = dropTargetRef.current;
                    if (t?.etapaId === col.etapaId) setDropTargetSync(null);
                  }}
                  onDragOverIndex={(index) => setDropTargetSync({ etapaId: col.etapaId, index })}
                  onDrop={() => void handleDrop()}
                  cardAcoes={cardAcoes}
                  cardAcaoHandlers={cardAcaoHandlers}
                  campanhaNomeById={campanhaNomeById}
                  corretorNomeById={corretorNomeById}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog
        header="Novo lead"
        visible={novoOpen}
        onHide={() => {
          if (saving) return;
          setNovoOpen(false);
          resetNovoLeadForm();
        }}
        className="w-full max-w-md"
        pt={CRM_DIALOG_PT}
        modal
        dismissableMask={!saving}
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome *">
            <InputText className="w-full" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <InputText className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Telefone">
            <div className="flex gap-2">
              <InputText
                placeholder="+55"
                className={cn(CRM_QUAL_INPUT_CLASS, "w-20 min-w-[5rem]")}
                value={ddi}
                onChange={(e) => setDdi(e.target.value)}
              />
              <InputText
                placeholder="(00) 00000-0000"
                className={cn(CRM_QUAL_INPUT_CLASS, "flex-1")}
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
              />
            </div>
          </Field>
          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Campanha</label>
            <Dropdown
              className="w-full bg-white/5 border-white/10 rounded-xl"
              value={campanhaId}
              options={campanhas.map((c) => ({ label: c.nome, value: c.id }))}
              onChange={(e) => setCampanhaId((e.value as number) ?? null)}
              placeholder={assignmentOptsLoading ? "Carregando…" : "Nenhuma"}
              showClear
              filter
              disabled={assignmentOptsLoading || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>
          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Imobiliária</label>
            <Dropdown
              className="w-full bg-white/5 border-white/10 rounded-xl"
              value={imobiliariaId}
              options={imobiliarias.map((i) => ({ label: i.label, value: i.id }))}
              onChange={(e) => setImobiliariaId((e.value as number) ?? null)}
              placeholder={assignmentOptsLoading ? "Carregando…" : "Nenhuma"}
              showClear
              filter
              disabled={assignmentOptsLoading || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>
          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Corretor</label>
            <Dropdown
              className="w-full bg-white/5 border-white/10 rounded-xl"
              value={corretorId}
              options={corretoresNovoFiltrados.map((c) => ({
                label: c.imobiliariaRazaoSocial
                  ? `${c.nome} · ${c.imobiliariaRazaoSocial}`
                  : c.nome,
                value: c.id,
              }))}
              onChange={(e) => setCorretorId((e.value as number) ?? null)}
              placeholder={assignmentOptsLoading ? "Carregando…" : "Nenhum"}
              showClear
              filter
              disabled={assignmentOptsLoading || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>
          <Field label="Empreendimento de interesse">
            <Dropdown
              className="w-full"
              value={empreendimento}
              options={empreendimentos.map((emp) => ({ label: emp, value: emp }))}
              onChange={(e) => setEmpreendimento((e.value as string | null) ?? null)}
              placeholder={
                empreendimentosLoading ? "Carregando empreendimentos…" : "Selecione o empreendimento"
              }
              filter
              showClear
              disabled={empreendimentosLoading}
            />
          </Field>
          <Field label="Temperatura">
            <Dropdown
              className="w-full"
              value={temperatura}
              options={TEMPERATURA_OPTIONS}
              onChange={(e) => setTemperatura(e.value as LeadTemperatura)}
            />
          </Field>
          <Button
            label="Salvar lead"
            className="mt-1 w-full"
            loading={saving}
            onClick={() => void salvarNovo()}
          />
        </div>
      </Dialog>

      <Dialog
        header="Motivo da perda"
        visible={perdaOpen}
        onHide={() => !saving && setPerdaOpen(false)}
        className="w-full max-w-md"
        pt={CRM_DIALOG_PT}
        modal
        dismissableMask={!saving}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            Este registro ajuda a entender padrões de desistência no funil.
          </p>
          <InputTextarea
            className="w-full"
            rows={4}
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            placeholder="Ex.: optou por outro empreendimento, preço, timing…"
          />
          <Button label="Confirmar perda" loading={saving} onClick={() => void confirmarPerda()} />
        </div>
      </Dialog>

      <Dialog
        header="Virar cliente"
        visible={converterOpen}
        onHide={() => {
          if (saving) return;
          setConverterOpen(false);
          setConverterLeadId(null);
          setConverterLeadNome("");
          setCpfConverter("");
        }}
        className="w-full max-w-md"
        pt={CRM_DIALOG_PT}
        modal
        dismissableMask={!saving}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            {converterLeadNome ? (
              <>
                Criar ou vincular contratante para <strong className="text-white/80">{converterLeadNome}</strong>.
                O lead será movido para a etapa de fechamento quando existir.
              </>
            ) : (
              "Informe o CPF para criar ou vincular o cadastro de cliente."
            )}
          </p>
          <Field label="CPF *">
            <InputText
              className="w-full bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all"
              value={cpfConverter}
              onChange={(e) => setCpfConverter(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
          </Field>
          <Button
            label="Confirmar conversão"
            icon={<UserCheck size={16} />}
            loading={saving}
            onClick={() => void confirmarConverter()}
          />
        </div>
      </Dialog>

      <Dialog
        header={
          interacaoLead ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>{interacaoLead.nome}</span>
              <TemperaturaBadge temperatura={interacaoLead.temperatura} />
            </div>
          ) : (
            "Interações"
          )
        }
        visible={interacaoOpen}
        onHide={() => {
          if (savingInteracao) return;
          setInteracaoOpen(false);
          setInteracaoLead(null);
          setInteracoes([]);
        }}
        className="w-full max-w-lg"
        pt={CRM_DIALOG_PT}
        modal
        dismissableMask={!savingInteracao}
      >
        {interacaoLead ? (
          <div className="flex flex-col gap-5">
            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                Histórico
              </h3>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
                {interacoesLoading ? (
                  <FunilLocalSpinner label="Carregando histórico" />
                ) : interacoes.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-white/35">
                    Nenhuma interação registrada ainda.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/[0.06]">
                    {interacoes.map((item) => (
                      <InteracaoTimelineItem key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                Nova interação
              </h3>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <Dropdown
                      className="w-full"
                      value={interacaoTipo}
                      options={INTERACAO_TIPO_OPTIONS}
                      onChange={(e) => setInteracaoTipo(e.value as LeadInteracaoTipo)}
                    />
                  </Field>
                  <Field label="Temperatura">
                    <Dropdown
                      className="w-full"
                      value={interacaoTemperatura}
                      options={TEMPERATURA_OPTIONS}
                      onChange={(e) => setInteracaoTemperatura(e.value as LeadTemperatura)}
                    />
                  </Field>
                </div>
                <Field label="Observação *">
                  <InputTextarea
                    className="w-full"
                    rows={4}
                    value={interacaoDescricao}
                    onChange={(e) => setInteracaoDescricao(e.target.value)}
                    placeholder="O que foi conversado, próximo passo, objeções…"
                  />
                </Field>
                <Button
                  label="Registrar interação"
                  icon={<MessageSquare size={16} />}
                  loading={savingInteracao}
                  onClick={() => void salvarInteracao()}
                />
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>

      <CrmLeadQualificacaoDialog
        lead={qualificacaoLead}
        open={qualificacaoOpen}
        onHide={() => {
          setQualificacaoOpen(false);
          setQualificacaoLead(null);
        }}
        onSaved={(updated) => {
          setBoard((current) => (current ? patchLeadInBoard(current, updated) : current));
          setQualificacaoLead(null);
        }}
      />

      <CrmLeadAtribuicaoDialog
        lead={atribuicaoLead}
        open={atribuicaoOpen}
        onHide={() => {
          setAtribuicaoOpen(false);
          setAtribuicaoLead(null);
        }}
        onSaved={(updated) => {
          setBoard((current) => (current ? patchLeadInBoard(current, updated) : current));
          setAtribuicaoLead(null);
        }}
      />
    </div>
  );
}

function InteracaoTimelineItem({ item }: { item: LeadAtividadeDto }) {
  const label = labelInteracaoTipo(item.tipo);
  const when = formatDtAtividade(item.dtAtividade);
  const autor =
    item.usuarioNome?.trim() ||
    (item.tipo === "CAPTACAO" ? "Captação pública" : null);
  return (
    <li className="px-4 py-3">
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300/80">
            {label}
          </span>
          {autor ? (
            <p className="mt-0.5 text-[11px] font-medium text-white/55">
              Por <span className="text-white/80">{autor}</span>
            </p>
          ) : null}
        </div>
        <time
          className="shrink-0 text-[10px] tabular-nums text-white/30"
          dateTime={item.dtAtividade}
        >
          {when}
        </time>
      </div>
      {item.descricao ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">{item.descricao}</p>
      ) : null}
    </li>
  );
}

function labelInteracaoTipo(tipo: LeadAtividadeDto["tipo"]): string {
  const map: Record<string, string> = {
    NOTA: "Nota",
    LIGACAO: "Ligação",
    WHATSAPP: "WhatsApp",
    EMAIL: "E-mail",
    VISITA: "Visita",
    MUDANCA_ETAPA: "Mudança de etapa",
    CONVERSAO: "Conversão",
    CAPTACAO: "Captação",
  };
  return map[tipo] ?? tipo;
}

function formatDtAtividade(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCpfDisplay(digits: string): string {
  const d = normalizeCpfDigits(digits).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function EtapaMetricChip({ coluna }: { coluna: KanbanColumnDto }) {
  const accent = coluna.corHex ?? "#64748B";
  return (
    <div
      role="listitem"
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5"
      title={coluna.nome}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <span className="max-w-[8rem] truncate text-[11px] font-medium text-white/70">
        {coluna.nome}
      </span>
      <span className="text-xs font-bold tabular-nums text-white/90">{coluna.leads.length}</span>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-2.5",
        accent
          ? "border-blue-500/30 bg-blue-500/10"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-white/35">
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 block font-[family-name:var(--font-playfair)] text-2xl font-bold tabular-nums",
          accent ? "text-blue-200" : "text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Índice de inserção na lista já sem o item arrastado. */
function kanbanInsertIndexBefore(fromIndex: number, beforeCardIndex: number): number {
  if (fromIndex < 0) return beforeCardIndex;
  return fromIndex < beforeCardIndex ? beforeCardIndex - 1 : beforeCardIndex;
}

function kanbanInsertIndexAfter(fromIndex: number, afterCardIndex: number): number {
  if (fromIndex < 0) return afterCardIndex + 1;
  return afterCardIndex < fromIndex ? afterCardIndex + 1 : afterCardIndex;
}

function kanbanFromIndex(coluna: KanbanColumnDto, dragLeadId: number | null): number {
  if (dragLeadId == null) return -1;
  return coluna.leads.findIndex((l) => l.id === dragLeadId);
}

function resolveInsertBefore(
  coluna: KanbanColumnDto,
  dragLeadId: number | null,
  beforeCardIndex: number,
): number {
  return kanbanInsertIndexBefore(kanbanFromIndex(coluna, dragLeadId), beforeCardIndex);
}

function resolveInsertAfter(
  coluna: KanbanColumnDto,
  dragLeadId: number | null,
  afterCardIndex: number,
): number {
  return kanbanInsertIndexAfter(kanbanFromIndex(coluna, dragLeadId), afterCardIndex);
}

function resolveAppendIndex(coluna: KanbanColumnDto, dragLeadId: number | null): number {
  const fromIndex = kanbanFromIndex(coluna, dragLeadId);
  return fromIndex >= 0 ? coluna.leads.length - 1 : coluna.leads.length;
}

function isKanbanOrderUnchanged(leads: LeadDto[], fromIndex: number, insertIndex: number): boolean {
  if (fromIndex < 0) return true;
  const next = [...leads];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(insertIndex, 0, removed);
  return next.every((l, i) => l.id === leads[i].id);
}

function KanbanColumn({
  coluna,
  isDragging,
  dragLeadId,
  dropTarget,
  onDragStart,
  onDragEnterColumn,
  onDragLeaveColumn,
  onDragOverIndex,
  onDrop,
  cardAcoes,
  cardAcaoHandlers,
  campanhaNomeById,
  corretorNomeById,
}: {
  coluna: KanbanColumnDto;
  isDragging: boolean;
  dragLeadId: number | null;
  dropTarget: KanbanDropTarget | null;
  onDragStart: (id: number) => void;
  onDragEnterColumn: () => void;
  onDragLeaveColumn: () => void;
  onDragOverIndex: (index: number) => void;
  onDrop: () => void;
  cardAcoes: FunilCardAcaoDto[];
  cardAcaoHandlers: FunilCardAcaoHandlers;
  campanhaNomeById: Map<number, string>;
  corretorNomeById: Map<number, string>;
}) {
  const accent = coluna.corHex ?? "#64748B";
  const isDropTarget = dropTarget?.etapaId === coluna.etapaId;

  return (
    <section
      className={cn(
        "flex w-[min(100%,320px)] min-w-[280px] shrink-0 flex-col rounded-2xl border transition-all duration-200",
        "border-white/10 bg-[#071C33]/80 backdrop-blur-sm",
        isDropTarget && "border-blue-400/50 bg-blue-500/[0.06] shadow-[0_0_0_1px_rgba(96,165,250,0.25)]",
        isDragging && !isDropTarget && "opacity-95",
      )}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragEnter={(e) => {
        if (e.currentTarget === e.target) onDragEnterColumn();
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <header className="relative overflow-hidden rounded-t-2xl border-b border-white/[0.06] px-4 py-3">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-white">{coluna.nome}</span>
            {coluna.finalGanho || coluna.finalPerdido ? (
              <span
                className={cn(
                  "mt-1 block text-[9px] font-bold uppercase tracking-[0.25em]",
                  coluna.finalGanho ? "text-emerald-400/80" : "text-rose-400/80",
                )}
              >
                {coluna.finalGanho ? "Fechamento" : "Encerrado"}
              </span>
            ) : null}
          </div>
          <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold tabular-nums text-white/70">
            {coluna.leads.length}
          </span>
        </div>
      </header>

      <ul
        className="flex max-h-[calc(100vh-18rem)] min-h-[140px] flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden p-3 [&>li]:shrink-0"
        onDragOver={(e) => {
          e.preventDefault();
          onDragEnterColumn();
        }}
      >
        {coluna.leads.length === 0 ? (
          <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] leading-relaxed text-white/25">
            Solte um lead aqui
          </li>
        ) : (
          coluna.leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isDragged={dragLeadId === lead.id}
              showDropBefore={
                isDropTarget &&
                dropTarget != null &&
                dropTarget.index === resolveInsertBefore(coluna, dragLeadId, index)
              }
              showDropAfter={
                isDropTarget &&
                dropTarget != null &&
                dropTarget.index === resolveInsertAfter(coluna, dragLeadId, index)
              }
              onDragStart={onDragStart}
              onDragOverCard={(insertBefore) =>
                onDragOverIndex(
                  insertBefore
                    ? resolveInsertBefore(coluna, dragLeadId, index)
                    : resolveInsertAfter(coluna, dragLeadId, index),
                )
              }
              cardAcoes={cardAcoes}
              cardAcaoHandlers={cardAcaoHandlers}
              campanhaNome={lead.campanhaId != null ? campanhaNomeById.get(lead.campanhaId) : undefined}
              corretorNome={lead.corretorId != null ? corretorNomeById.get(lead.corretorId) : undefined}
            />
          ))
        )}
        {isDropTarget &&
        dropTarget != null &&
        dropTarget.index === resolveAppendIndex(coluna, dragLeadId) &&
        coluna.leads.length > 0 ? (
          <li
            className="h-0.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
            aria-hidden
          />
        ) : null}
      </ul>
    </section>
  );
}

function LeadCard({
  lead,
  isDragged,
  showDropBefore,
  showDropAfter,
  onDragStart,
  onDragOverCard,
  cardAcoes,
  cardAcaoHandlers,
  campanhaNome,
  corretorNome,
}: {
  lead: LeadDto;
  isDragged: boolean;
  showDropBefore: boolean;
  showDropAfter: boolean;
  onDragStart: (id: number) => void;
  onDragOverCard: (insertBefore: boolean) => void;
  cardAcoes: FunilCardAcaoDto[];
  cardAcaoHandlers: FunilCardAcaoHandlers;
  campanhaNome?: string;
  corretorNome?: string;
}) {
  const jaCliente = lead.contratanteId != null;
  const pctCadastro = lead.percentualCadastroCliente ?? 0;
  const cadastroCompleto = lead.cadastroClienteCompleto ?? false;
  const tempStyle = TEMPERATURA_CARD_STYLE[lead.temperatura];
  const acoesVisiveis = filterFunilCardAcoesForLead(cardAcoes, lead);
  return (
    <li
      draggable
      onDragStart={() => onDragStart(lead.id)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        onDragOverCard(insertBefore);
      }}
      className={cn(
        "group relative shrink-0 cursor-grab rounded-xl border border-l-[3px] p-4",
        tempStyle.card,
        tempStyle.accent,
        "shadow-sm transition-all duration-150",
        "hover:brightness-110 hover:shadow-md",
        tempStyle.active,
        isDragged && "opacity-40",
      )}
    >
      {showDropBefore ? (
        <span
          className="pointer-events-none absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
          aria-hidden
        />
      ) : null}
      {showDropAfter ? (
        <span
          className="pointer-events-none absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
          aria-hidden
        />
      ) : null}
      <div className="mb-3 flex items-start gap-2">
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 text-white/15 group-hover:text-white/35"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium leading-snug text-white break-words">{lead.nome}</p>
          <div className="flex justify-start">
            <TemperaturaBadge temperatura={lead.temperatura} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs leading-relaxed text-white/45">
        {lead.telefone ? (
          <p className="flex items-start gap-1.5">
            <Phone size={12} className="mt-0.5 shrink-0 text-white/25" aria-hidden />
            <span className="min-w-0 break-words">{lead.telefone}</span>
          </p>
        ) : null}
        {lead.email ? (
          <p className="flex items-start gap-1.5">
            <Mail size={12} className="mt-0.5 shrink-0 text-white/25" aria-hidden />
            <span className="min-w-0 break-all">{lead.email}</span>
          </p>
        ) : null}
        {lead.empreendimentoInteresse ? (
          <p className="flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0 text-white/25" aria-hidden />
            <span className="line-clamp-2">{lead.empreendimentoInteresse}</span>
          </p>
        ) : null}
        {campanhaNome ? (
          <p className="truncate text-white/35" title={`Campanha: ${campanhaNome}`}>
            Campanha · {campanhaNome}
          </p>
        ) : null}
        {corretorNome ? (
          <p className="truncate text-white/35" title={`Corretor: ${corretorNome}`}>
            Corretor · {corretorNome}
          </p>
        ) : null}
      </div>

      <div className="mt-3.5 border-t border-white/[0.06] pt-3">
        <p className="mb-2.5 px-1 text-center text-[10px] font-medium uppercase tracking-wider text-white/30">
          {jaCliente ? `Cliente #${lead.contratanteId}` : lead.origem.replace("_", " ")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {!jaCliente && pctCadastro < 100 ? (
            <span
              className="rounded-md border border-blue-500/25 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-blue-200"
              title="Progresso do cadastro para cliente"
            >
              {pctCadastro}%
            </span>
          ) : null}
          {acoesVisiveis.map((acao) => (
            <FunilCardAcaoButton
              key={acao.acaoCodigo}
              acao={acao}
              lead={lead}
              cadastroCompleto={cadastroCompleto}
              onRun={cardAcaoHandlers[acao.acaoCodigo]}
            />
          ))}
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/50">
            {lead.score} pts
          </span>
        </div>
      </div>
    </li>
  );
}

function FunilCardAcaoButton({
  acao,
  lead,
  cadastroCompleto,
  onRun,
}: {
  acao: FunilCardAcaoDto;
  lead: LeadDto;
  cadastroCompleto: boolean;
  onRun?: (lead: LeadDto) => void;
}) {
  if (!onRun) return null;
  const titulo = acao.descricao ?? acao.rotulo;

  if (acao.tipoExibicao === "BUTTON") {
    return (
      <button
        type="button"
        className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
        title={titulo}
        aria-label={`${acao.rotulo} — ${lead.nome}`}
        onClick={(e) => {
          e.stopPropagation();
          onRun(lead);
        }}
      >
        {acao.rotulo}
      </button>
    );
  }

  const Icon = funilCardAcaoIcon(acao.icone);
  const qualificacaoDestaque =
    acao.acaoCodigo === "QUALIFICACAO" && cadastroCompleto;

  return (
    <button
      type="button"
      className={cn(
        "rounded-md border p-1 transition",
        qualificacaoDestaque
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white",
      )}
      title={titulo}
      aria-label={`${acao.rotulo} — ${lead.nome}`}
      onClick={(e) => {
        e.stopPropagation();
        onRun(lead);
      }}
    >
      {Icon ? <Icon size={12} aria-hidden /> : <span className="text-[9px] font-bold">{acao.rotulo.slice(0, 1)}</span>}
    </button>
  );
}

function TemperaturaBadge({ temperatura }: { temperatura: LeadTemperatura }) {
  const config = {
    FRIO: {
      icon: Snowflake,
      className: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
      label: "Frio",
    },
    MORNO: {
      icon: Thermometer,
      className:
        "border-orange-500/40 bg-orange-500/20 text-orange-100 shadow-[0_0_12px_rgba(249,115,22,0.18)]",
      label: "Morno",
    },
    QUENTE: {
      icon: Flame,
      className: "border-rose-500/25 bg-rose-500/10 text-rose-200",
      label: "Quente",
    },
  }[temperatura];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        config.className,
      )}
      title={`Temperatura: ${config.label}`}
    >
      <Icon size={10} aria-hidden />
      {config.label}
    </span>
  );
}
