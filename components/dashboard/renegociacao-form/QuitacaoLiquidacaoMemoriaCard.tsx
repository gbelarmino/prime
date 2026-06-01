"use client";

import { InadimplenciaPresenteCard } from "@/components/dashboard/renegociacao-form/InadimplenciaPresenteCard";
import type { InadimplenciaPresenteAgregado } from "@/lib/renegociacao-inadimplencia-presente";
import {
  aplicarDescontoQuitacao,
  totalQuitacaoAntesDesconto,
} from "@/lib/renegociacao-quitacao-calculo";
import { cn } from "@/lib/utils";

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaProps = {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
  className?: string;
};

function LinhaMemoria({ rotulo, valor, detalhe, destaque, className }: LinhaProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between",
        className,
      )}
    >
      <span className={cn("text-sm", destaque ? "font-medium text-white" : "text-white/60")}>
        {rotulo}
      </span>
      <div className="text-right">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            destaque ? "text-lg font-semibold text-sky-200" : "text-white",
          )}
        >
          {valor}
        </span>
        {detalhe ? <p className="mt-0.5 text-xs text-white/45">{detalhe}</p> : null}
      </div>
    </div>
  );
}

type Props = {
  saldoDevedor: number;
  saldoDevedorDetalhe?: string;
  inadimplenciaAgregado: InadimplenciaPresenteAgregado | null;
  nominalPainel?: number | null;
  desconto?: number | null;
  pctDesconto?: number | null;
  /** Fallback quando a API não trouxe VP coerente no agregado. */
  inadimplenciaVpFallback?: number;
  className?: string;
};

/** Memória transportada do passo de parâmetros: saldo + inadimplência VP − desconto = valor a pagar. */
export function QuitacaoLiquidacaoMemoriaCard({
  saldoDevedor,
  saldoDevedorDetalhe,
  inadimplenciaAgregado,
  nominalPainel,
  desconto,
  pctDesconto,
  inadimplenciaVpFallback = 0,
  className,
}: Props) {
  const inadimplenciaVp =
    inadimplenciaAgregado?.valorPresenteTotal ?? inadimplenciaVpFallback ?? 0;
  const totalAntesDesconto = totalQuitacaoAntesDesconto(saldoDevedor, inadimplenciaVp);
  const valorLiquidacao = aplicarDescontoQuitacao(
    totalAntesDesconto,
    pctDesconto,
    desconto,
  );
  const vlDesconto = Math.max(0, Math.round((totalAntesDesconto - valorLiquidacao) * 100) / 100);
  const temDesconto = vlDesconto > 0.005;
  const pct =
    pctDesconto != null && pctDesconto > 0
      ? pctDesconto
      : totalAntesDesconto > 0 && temDesconto
        ? Math.round((vlDesconto / totalAntesDesconto) * 10000) / 100
        : null;
  const memoriaTotal =
    inadimplenciaVp > 0.005
      ? `${formatBrl(saldoDevedor)} + ${formatBrl(inadimplenciaVp)} = ${formatBrl(totalAntesDesconto)}`
      : undefined;

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 sm:px-5",
        className,
      )}
    >
      <p className="border-b border-white/10 py-3 text-sm font-medium text-white">
        Memória de cálculo — liquidação
      </p>
      <LinhaMemoria
        rotulo="Saldo devedor"
        valor={formatBrl(saldoDevedor)}
        detalhe={saldoDevedorDetalhe}
      />
      <div className="py-3">
        <InadimplenciaPresenteCard
          agregado={inadimplenciaAgregado}
          nominalPainel={nominalPainel}
        />
      </div>
      <LinhaMemoria
        rotulo="Total antes do desconto"
        valor={formatBrl(totalAntesDesconto)}
        detalhe={memoriaTotal}
        destaque
      />
      {temDesconto ? (
        <LinhaMemoria
          rotulo={pct != null ? `Desconto (${pct.toLocaleString("pt-BR")}%)` : "Desconto"}
          valor={formatBrl(vlDesconto)}
        />
      ) : (
        <LinhaMemoria rotulo="Desconto" valor="Sem desconto" />
      )}
      <LinhaMemoria
        rotulo="Valor a pagar (liquidação)"
        valor={formatBrl(valorLiquidacao)}
        destaque
      />
    </div>
  );
}
