"use client";

import { Dialog, type DialogProps } from "primereact/dialog";

/**
 * Dialog do painel com scroll da página bloqueado enquanto aberto.
 * PrimeReact usa `blockScroll={false}` por padrão — aqui fica sempre ativo.
 */
export function DashboardDialog({
  modal = true,
  blockScroll = true,
  dismissableMask = false,
  ...props
}: DialogProps) {
  return (
    <Dialog
      modal={modal}
      blockScroll={blockScroll}
      dismissableMask={dismissableMask}
      {...props}
    />
  );
}
