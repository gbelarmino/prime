"use client";

import type { ReactNode } from "react";
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react";
import { Button } from "primereact/button";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { dashboardDialogPt } from "@/lib/dashboard-dialog";
import { cn } from "@/lib/utils";

export type DashboardConfirmTone = "default" | "warning" | "danger";

export type DashboardConfirmDialogProps = {
  visible: boolean;
  onHide: () => void;
  onConfirm: () => void | Promise<void>;
  header: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DashboardConfirmTone;
  loading?: boolean;
  confirmDisabled?: boolean;
};

const TONE_STYLES: Record<
  DashboardConfirmTone,
  { icon: typeof HelpCircle; iconWrap: string; iconColor: string; button: string }
> = {
  default: {
    icon: HelpCircle,
    iconWrap: "bg-blue-500/10",
    iconColor: "text-blue-400",
    button: "bg-blue-600 hover:bg-blue-700 border-none",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-500/10",
    iconColor: "text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700 border-none",
  },
  danger: {
    icon: Trash2,
    iconWrap: "bg-rose-500/10",
    iconColor: "text-rose-400",
    button: "bg-rose-600 hover:bg-rose-700 border-none",
  },
};

export function DashboardConfirmDialog({
  visible,
  onHide,
  onConfirm,
  header,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  loading = false,
  confirmDisabled = false,
}: DashboardConfirmDialogProps) {
  const styles = TONE_STYLES[tone];
  const Icon = styles.icon;

  return (
    <DashboardDialog
      header={header}
      visible={visible}
      onHide={() => {
        if (!loading) onHide();
      }}
      className="w-full max-w-md mx-4"
      footer={
        <div className="flex justify-end gap-3 p-4">
          <Button
            label={cancelLabel}
            onClick={onHide}
            className="p-button-text text-white/40"
            disabled={loading}
          />
          <Button
            label={loading ? "A processar…" : confirmLabel}
            onClick={() => void onConfirm()}
            className={cn(styles.button, "px-6")}
            disabled={loading || confirmDisabled}
          />
        </div>
      }
      contentClassName="bg-[#020817] p-6 text-white/60 text-sm leading-relaxed"
      headerClassName="bg-[#020817] border-b border-white/5 p-6 text-white"
      pt={dashboardDialogPt({
        root: { className: "rounded-[2rem] overflow-hidden border border-white/10" },
      })}
    >
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full",
            styles.iconWrap,
          )}
        >
          <Icon size={24} className={styles.iconColor} />
        </div>
        <div className="text-center text-white/70">{message}</div>
      </div>
    </DashboardDialog>
  );
}
