/** Helpers UI do Ops Signal Desk (lista / preview / iniciais). */

export function iniciaisTitulo(titulo: string | null | undefined): string {
  const t = (titulo ?? "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function formatHoraRelativaLista(
  iso: string | null | undefined,
  nowMs = Date.now(),
): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffSec = Math.floor((nowMs - t) / 1000);
  if (diffSec < 60) return "agora";
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) {
    return new Date(t).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffSec < 86400 * 7) {
    return new Date(t).toLocaleDateString("pt-BR", { weekday: "short" });
  }
  return new Date(t).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Chave de calendário local (YYYY-MM-DD) para agrupar bolhas do mesmo dia. */
export function chatDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rótulo do separador de dia no thread (Hoje / Ontem / weekday / dd/MM/yyyy). */
export function formatChatDaySeparator(
  iso: string | null | undefined,
  nowMs = Date.now(),
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const startOf = (ms: number) => {
    const x = new Date(ms);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const diffDays = Math.round((startOf(nowMs) - startOf(d.getTime())) / 86_400_000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "long" });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function janelaAvatarRingClass(estado: string | null | undefined): string {
  const e = (estado ?? "SEM_INBOUND").toUpperCase();
  if (e === "ABERTA") return "wa-desk__avatar-ring--aberta";
  if (e === "FECHANDO") return "wa-desk__avatar-ring--fechando";
  if (e === "FECHADA") return "wa-desk__avatar-ring--fechada";
  return "wa-desk__avatar-ring--sem_inbound";
}

/** Badge do status do ticket (ABERTA / PENDENTE / RESOLVIDA), distinto da janela Meta. */
export function conversaStatusBadge(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const s = (status ?? "").toUpperCase();
  if (s === "ABERTA") {
    return {
      label: "Em aberto",
      className: "bg-blue-500/15 text-blue-200/90 ring-blue-400/35",
    };
  }
  if (s === "PENDENTE") {
    return {
      label: "Pendente",
      className: "bg-amber-500/15 text-amber-200/90 ring-amber-400/35",
    };
  }
  if (s === "RESOLVIDA") {
    return {
      label: "Resolvida",
      className: "bg-white/5 text-white/45 ring-white/15",
    };
  }
  return {
    label: status || "—",
    className: "bg-white/5 text-white/45 ring-white/15",
  };
}
