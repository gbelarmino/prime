"use client";

import type { ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { dashboardDialogPt } from "@/lib/dashboard-dialog";
import { cn } from "@/lib/utils";

export type DashboardPromptDialogProps = {
  visible: boolean;
  onHide: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  header: string;
  message?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
};

export function DashboardPromptDialog({
  visible,
  onHide,
  onSubmit,
  header,
  message,
  value,
  onValueChange,
  placeholder,
  submitLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  multiline = false,
  required = true,
  maxLength = 2000,
}: DashboardPromptDialogProps) {
  const trimmed = value.trim();
  const submitDisabled = loading || (required && !trimmed);

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
            label={loading ? "A processar…" : submitLabel}
            onClick={() => void onSubmit(trimmed)}
            className={cn("border-none bg-rose-600 px-6 hover:bg-rose-700")}
            disabled={submitDisabled}
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
        <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
          <MessageSquare size={24} className="text-rose-400" />
        </div>
        {message ? <div className="text-center text-white/70">{message}</div> : null}
        <div className="flex flex-col gap-2">
          {multiline ? (
            <InputTextarea
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              rows={4}
              autoResize
              maxLength={maxLength}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/25"
              placeholder={placeholder}
            />
          ) : (
            <InputText
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              maxLength={maxLength}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/25"
              placeholder={placeholder}
            />
          )}
        </div>
      </div>
    </DashboardDialog>
  );
}
