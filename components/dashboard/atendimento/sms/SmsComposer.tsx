"use client";

import { useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";

type Props = {
  disabled: boolean;
  texto: string;
  onTexto: (v: string) => void;
  onEnviar: () => void;
  loading: boolean;
  hasSelected: boolean;
};

export function SmsComposer({
  disabled,
  texto,
  onTexto,
  onEnviar,
  loading,
  hasSelected,
}: Props) {
  const textoRef = useRef<HTMLTextAreaElement | null>(null);
  const charCount = texto.length;

  useEffect(() => {
    if (disabled || !hasSelected) return;
    const id = window.requestAnimationFrame(() => {
      textoRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [disabled, hasSelected]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && texto.trim()) onEnviar();
    }
  }

  return (
    <div className="border-t border-white/10 p-2.5">
      <div className="flex items-end gap-1.5">
        <InputTextarea
          ref={(el) => {
            if (!el) {
              textoRef.current = null;
              return;
            }
            const anyEl = el as unknown as {
              getElement?: () => HTMLTextAreaElement;
            };
            textoRef.current =
              typeof anyEl.getElement === "function"
                ? anyEl.getElement()
                : (el as unknown as HTMLTextAreaElement);
          }}
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          autoResize
          className="min-h-[2.5rem] w-full !py-2 text-sm"
          placeholder={
            hasSelected
              ? "Escreva o SMS… (Enter envia)"
              : "Selecione uma conversa"
          }
          disabled={disabled}
        />
        <Button
          icon="pi pi-send"
          className="!h-10 !w-10 shrink-0"
          onClick={onEnviar}
          disabled={disabled || !texto.trim()}
          loading={loading}
          aria-label="Enviar SMS"
        />
      </div>
      {hasSelected ? (
        <p
          className={`mt-1.5 text-[11px] ${
            charCount > 160 ? "text-amber-300/90" : "text-white/35"
          }`}
        >
          {charCount} caracteres
          {charCount > 160 ? " — pode gerar múltiplos segmentos SMS" : ""}
        </p>
      ) : null}
    </div>
  );
}
