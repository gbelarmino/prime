"use client";

import type { InadimplenciaPresenteAgregado } from "@/lib/renegociacao-inadimplencia-presente";
import { cn } from "@/lib/utils";

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function formatDateBr(iso: string) {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  agregado: InadimplenciaPresenteAgregado | null;
  nominalPainel?: number | null;
  className?: string;
};

export function InadimplenciaPresenteCard({ agregado, nominalPainel, className }: Props) {
  if (!agregado || agregado.valorPresenteTotal <= 0) {
    return (
      <div
        className={cn(
          "w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5 sm:py-4",
          className,
        )}
      >
        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">
          Inadimplência (valor presente)
        </span>
        <p className="mt-2 font-mono text-base font-semibold text-white/50 sm:text-lg">—</p>
        <p className="mt-2 text-xs text-white/35">Nenhum título vencido na base considerada.</p>
      </div>
    );
  }

  const enc = agregado.itens[0];
  const dataReferencia = agregado.itens[0]?.dataCalculo ?? new Date().toISOString().slice(0, 10);

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-widest text-rose-300/80">
        Inadimplência (valor presente)
      </span>
      <p className="mt-2 break-words font-mono text-base font-semibold text-rose-200 sm:text-lg">
        {formatBrl(agregado.valorPresenteTotal)}
      </p>

      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-xs text-white/55">
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
          <span>Nominal (vencidos)</span>
          <span className="font-mono text-white/80">{formatBrl(agregado.nominalTotal)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
          <span>+ Multa ({enc ? formatPct(enc.multaPercentual) : "—"})</span>
          <span className="font-mono text-white/80">{formatBrl(agregado.multaTotal)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
          <span>+ Juros ({enc ? formatPct(enc.jurosMensalPercentual) : "—"} a.m. pro-rata)</span>
          <span className="font-mono text-white/80">{formatBrl(agregado.jurosTotal)}</span>
        </div>
        {agregado.memoriaCalculo ? (
          <p className="pt-1 font-mono text-[11px] leading-relaxed text-white/45">
            {agregado.memoriaCalculo}
          </p>
        ) : null}
        {nominalPainel != null && nominalPainel > 0 && Math.abs(nominalPainel - agregado.nominalTotal) > 0.01 ? (
          <p className="text-[10px] text-white/35">
            Painel (nominal): {formatBrl(nominalPainel)} — pode divergir da soma por parcela de corte.
          </p>
        ) : null}
      </div>

      {agregado.itens.length > 0 ? (
        <ul className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {agregado.itens.map((item, idx) => (
            <li
              key={`${item.vencimento}-${item.valorNominal}-${idx}`}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55"
            >
              <div className="mb-1.5 flex flex-wrap justify-between gap-1 font-medium text-white/70">
                <span>Parcela vencida</span>
                {item.diasAtraso > 0 ? (
                  <span className="font-mono text-rose-200/90">{item.diasAtraso} dias em atraso</span>
                ) : (
                  <span className="text-white/40">Sem atraso</span>
                )}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:block">
                  <span className="text-white/40">Vencimento</span>
                  <span className="font-mono text-white/85">{formatDateBr(item.vencimento)}</span>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <span className="text-white/40">Cálculo até</span>
                  <span className="font-mono text-white/85">{formatDateBr(dataReferencia)}</span>
                </div>
              </div>
              <p className="mt-2 font-mono leading-snug text-white/75">
                {formatBrl(item.valorNominal)} + {formatBrl(item.valorMulta)} + {formatBrl(item.valorJuros)} ={" "}
                {formatBrl(item.valorAtualizado)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
