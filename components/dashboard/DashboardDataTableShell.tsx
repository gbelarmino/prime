import type { ReactNode } from "react";
import {
  DASHBOARD_DATATABLE_INSET_SHELL_CLASS,
  DASHBOARD_DATATABLE_SHELL_CLASS,
} from "@/lib/dashboard-datatable";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** true = dentro de card (menos destaque visual). */
  inset?: boolean;
  className?: string;
};

/**
 * Contentor visual padrão das tabelas do dashboard (borda, fundo, sombra).
 */
export function DashboardDataTableShell({ children, inset = false, className }: Props) {
  return (
    <div
      className={cn(
        inset ? DASHBOARD_DATATABLE_INSET_SHELL_CLASS : DASHBOARD_DATATABLE_SHELL_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}
