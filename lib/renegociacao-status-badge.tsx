"use client";

import { dashboardStatusBadge } from "@/lib/dashboard-datatable";
import {
  STATUS_RENEGOCIACAO_LABEL,
  STATUS_RENEGOCIACAO_TONES,
  type StatusRenegociacao,
} from "@/lib/renegociacao-types";

/** Badge de status de renegociação com cores centralizadas por código enum. */
export function renegociacaoStatusBadge(status: StatusRenegociacao) {
  const label = STATUS_RENEGOCIACAO_LABEL[status] ?? status;
  return dashboardStatusBadge(label, STATUS_RENEGOCIACAO_TONES, status);
}
