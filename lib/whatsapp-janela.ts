/** Helpers da janela de texto livre WhatsApp (countdown + badges). */

export type JanelaEstadoUi = "ABERTA" | "FECHANDO" | "FECHADA" | "SEM_INBOUND";

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Rótulo compacto para a lista (ex.: "Aberta 5h", "Fecha em 12min"). */
export function janelaBadgeLabel(
  estado: string | null | undefined,
  restanteSegundos: number,
): string {
  const e = (estado ?? "SEM_INBOUND").toUpperCase();
  if (e === "SEM_INBOUND") return "Sem inbound";
  if (e === "FECHADA" || restanteSegundos <= 0) return "Fechada";
  if (e === "FECHANDO") {
    const min = Math.max(1, Math.ceil(restanteSegundos / 60));
    return `Fecha em ${min}min`;
  }
  // ABERTA
  if (restanteSegundos >= 3600) {
    const h = Math.floor(restanteSegundos / 3600);
    return `Aberta ${h}h`;
  }
  const min = Math.max(1, Math.ceil(restanteSegundos / 60));
  return `Aberta ${min}min`;
}

export function janelaBadgeClass(estado: string | null | undefined): string {
  const e = (estado ?? "SEM_INBOUND").toUpperCase();
  if (e === "ABERTA") return "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30";
  if (e === "FECHANDO") return "bg-amber-500/25 text-amber-200 ring-amber-500/40";
  return "bg-white/10 text-white/45 ring-white/10";
}

export function janelaPodeTextoLivre(estado: string | null | undefined): boolean {
  const e = (estado ?? "SEM_INBOUND").toUpperCase();
  return e === "ABERTA" || e === "FECHANDO";
}

export function janelaHeaderText(
  estado: string | null | undefined,
  restanteSegundos: number,
): string {
  const e = (estado ?? "SEM_INBOUND").toUpperCase();
  if (e === "SEM_INBOUND") return "Sem mensagem do cliente · janela fechada";
  if (e === "FECHADA" || restanteSegundos <= 0) return "Janela fechada";
  if (e === "FECHANDO") {
    return `Fecha em breve · resta ${formatCountdown(restanteSegundos)}`;
  }
  return `Janela aberta · resta ${formatCountdown(restanteSegundos)}`;
}

/** Recalcula restante a partir de janelaExpiraEm (ISO). */
export function segundosAte(expiraEmIso: string | null | undefined, nowMs = Date.now()): number {
  if (!expiraEmIso) return 0;
  const t = Date.parse(expiraEmIso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - nowMs) / 1000));
}
