"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Button } from "primereact/button";
import type { EfetivacaoOperacao, EfetivarRenegociacaoResultado } from "@/lib/renegociacao-types";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  CANCELAR_VENCIDA: "Cancelar vencida (Unicred)",
  CANCELAR_VINCENDA: "Cancelar vincenda (Unicred)",
  CRIAR_REEMISSAO: "Criar título reemitido",
  REGISTRAR_REEMISSAO: "Registrar boleto na Unicred",
};

const STATUS_ICON = {
  SUCESSO: CheckCircle2,
  FALHA: XCircle,
  PENDENTE: Circle,
  PULADO: Circle,
} as const;

function statusTone(status: string): string {
  switch (status) {
    case "SUCESSO":
      return "text-emerald-400";
    case "FALHA":
      return "text-rose-400";
    case "PENDENTE":
      return "text-amber-300/80";
    default:
      return "text-white/40";
  }
}

function linhaOperacao(op: EfetivacaoOperacao) {
  const tipo = TIPO_LABEL[op.tipo] ?? op.tipo;
  const parcela = op.numeroParcela != null ? `P${op.numeroParcela}` : "";
  const titulo = op.tituloDestinoId ?? op.tituloOrigemId;
  const partes = [tipo, parcela, titulo ? `título ${titulo.slice(0, 8)}…` : ""].filter(Boolean);
  let detalhe = "";
  if (op.statusTituloResultado) {
    detalhe = ` → ${op.statusTituloResultado}`;
  }
  if (op.codigoInstrucaoBaixa) {
    detalhe += ` (instrução ${op.codigoInstrucaoBaixa})`;
  }
  if (op.mensagemErro) {
    detalhe = ` — ${op.mensagemErro}`;
  }
  return `${partes.join(" · ")}${detalhe}`;
}

type Props = {
  resultado: EfetivarRenegociacaoResultado;
  contratoId: number;
  loading?: boolean;
  onRetentar?: () => void;
  className?: string;
};

export function RenegociacaoEfetivacaoResultado({
  resultado,
  contratoId,
  loading,
  onRetentar,
  className,
}: Props) {
  const { concluida, mensagemResumo, operacoes, status } = resultado;
  const parcial = status === "EFETIVACAO_PARCIAL" || (!concluida && operacoes.some((o) => o.statusOperacao === "FALHA"));
  const sucesso = concluida && status === "EFETIVADO";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        className={cn(
          "flex gap-3 rounded-2xl border px-4 py-4 sm:px-5",
          sucesso
            ? "border-emerald-500/25 bg-emerald-500/[0.08]"
            : parcial
              ? "border-amber-500/25 bg-amber-500/[0.08]"
              : "border-white/10 bg-white/[0.03]",
        )}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-violet-400" />
        ) : sucesso ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300" />
        )}
        <div>
          <p className="text-sm font-semibold text-white">
            {loading
              ? "Efetivando…"
              : sucesso
                ? "Efetivação concluída"
                : parcial
                  ? "Efetivação parcial — ação necessária"
                  : "Resultado da efetivação"}
          </p>
          <p className="mt-1 text-sm text-white/70">{mensagemResumo}</p>
          {parcial && !loading ? (
            <p className="mt-2 text-xs text-amber-100/80">
              O que já teve sucesso na Unicred foi gravado. Retome para concluir as operações pendentes ou
              com falha.
            </p>
          ) : null}
        </div>
      </div>

      {operacoes.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/45">
            Operações na Unicred / títulos
          </h3>
          <ul className="mt-3 space-y-2">
            {operacoes.map((op) => {
              const Icon = STATUS_ICON[op.statusOperacao as keyof typeof STATUS_ICON] ?? Circle;
              return (
                <li key={op.id ?? op.sequencia} className="flex gap-2.5 text-sm leading-snug text-white/75">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", statusTone(op.statusOperacao))} />
                  <span>{linhaOperacao(op)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {parcial && onRetentar ? (
          <Button
            type="button"
            loading={loading}
            onClick={onRetentar}
            className="rounded-full border-0 bg-amber-600 px-6 py-3 text-xs font-black uppercase tracking-widest"
            label="Retomar efetivação"
          />
        ) : null}
        {sucesso ? (
          <Link href={`/dashboard/contratos?highlight=${contratoId}`}>
            <Button
              type="button"
              className="w-full rounded-full border-0 bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-widest sm:w-auto"
              label="Voltar aos contratos"
            />
          </Link>
        ) : null}
        <Link href={`/dashboard/fin/titulos?contratoId=${contratoId}`}>
          <Button
            type="button"
            outlined
            className="w-full rounded-full border-white/20 px-6 py-3 text-xs font-black uppercase tracking-widest text-white sm:w-auto"
            label="Ver títulos do contrato"
          />
        </Link>
      </div>
    </div>
  );
}
