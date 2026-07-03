import type { TituloCobranca, TituloSmsNotificacao, TituloSmsNotificacaoResumo } from "@/lib/fin-service";
import type { SmsFilaItem } from "@/lib/sms-service";
import {
  normalizeSmsFilaItem,
  type SmsFilaWsEvent,
} from "@/lib/sms-fila-realtime";
import type { SpringPage } from "@/lib/spring-page";

const SMS_SUCESSO = new Set(["sent", "delivered", "ENVIADO", "SUCESSO"]);

export function tituloIdsAsStrings(ids?: string[] | null): string[] {
  return (ids ?? []).map((id) => String(id));
}

export function resumoFromFilaItem(item: SmsFilaItem): TituloSmsNotificacaoResumo {
  return {
    id: item.id,
    status: item.status,
    dataAgendada: item.dataAgendada,
    dataEnvio: item.dataEnvio ?? null,
  };
}

function contarSmsSucesso(notificacoes: TituloSmsNotificacaoResumo[]): number {
  return notificacoes.filter((n) => SMS_SUCESSO.has(n.status)).length;
}

function mergeSmsNotificacao(
  existing: TituloSmsNotificacaoResumo[] | undefined,
  resumo: TituloSmsNotificacaoResumo,
): TituloSmsNotificacaoResumo[] {
  const list = [...(existing ?? [])];
  const idx = list.findIndex((n) => n.id === resumo.id);
  if (idx >= 0) {
    list[idx] = resumo;
  } else {
    list.push(resumo);
  }
  return list.sort((a, b) => a.id - b.id);
}

function patchTituloRow(
  row: TituloCobranca,
  tituloIds: Set<string>,
  resumo: TituloSmsNotificacaoResumo,
): TituloCobranca {
  if (!tituloIds.has(row.id)) return row;
  const smsNotificacoes = mergeSmsNotificacao(row.smsNotificacoes, resumo);
  return {
    ...row,
    smsNotificacoes,
    smsNotificacoesEnviadas: contarSmsSucesso(smsNotificacoes),
  };
}

export function applyTitulosSmsFromEnqueue(
  prev: SpringPage<TituloCobranca> | null,
  tituloIds: string[],
  resumo: TituloSmsNotificacaoResumo | null | undefined,
): SpringPage<TituloCobranca> | null {
  if (!prev || !resumo || tituloIds.length === 0) return prev;
  const idSet = new Set(tituloIds);
  return {
    ...prev,
    content: prev.content.map((row) => patchTituloRow(row, idSet, resumo)),
  };
}

export type TituloSmsLoteGrupoPatch = {
  enfileirado: boolean;
  tituloIds?: string[] | null;
  smsNotificacao?: TituloSmsNotificacaoResumo | null;
};

export function applyTitulosSmsFromLoteGrupos(
  prev: SpringPage<TituloCobranca> | null,
  grupos: TituloSmsLoteGrupoPatch[],
): SpringPage<TituloCobranca> | null {
  if (!prev) return prev;
  return grupos.reduce<SpringPage<TituloCobranca> | null>((acc, grupo) => {
    if (!grupo.enfileirado || !grupo.smsNotificacao) return acc;
    const ids = tituloIdsAsStrings(grupo.tituloIds);
    if (ids.length === 0) return acc;
    return applyTitulosSmsFromEnqueue(acc, ids, grupo.smsNotificacao);
  }, prev);
}

export function resolveTituloIdsFromFilaItem(item: SmsFilaItem): string[] {
  if (item.tituloIds?.length) {
    return tituloIdsAsStrings(item.tituloIds);
  }
  if (item.tituloCobrancaId) {
    return [String(item.tituloCobrancaId)];
  }
  return [];
}

export function applyTitulosSmsFromWsEvent(
  prev: SpringPage<TituloCobranca> | null,
  event: SmsFilaWsEvent,
): SpringPage<TituloCobranca> | null {
  if (!prev) return prev;
  const item = normalizeSmsFilaItem(event.item);
  const tituloIds = resolveTituloIdsFromFilaItem(item);
  if (tituloIds.length === 0) return prev;
  return applyTitulosSmsFromEnqueue(prev, tituloIds, resumoFromFilaItem(item));
}

export function mergeTituloSmsNotificacaoList(
  prev: TituloSmsNotificacao[],
  item: SmsFilaItem,
  tituloId: string,
): TituloSmsNotificacao[] | null {
  const tituloIds = resolveTituloIdsFromFilaItem(item);
  if (!tituloIds.includes(tituloId)) return null;
  const idx = prev.findIndex((n) => n.id === item.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = item;
    return next;
  }
  return [...prev, item].sort((a, b) => a.id - b.id);
}
