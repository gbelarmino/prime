"use client";

import { useMemo, useState } from "react";

export type FluxoReceitaStackSegment = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

export type FluxoReceitaSerie = {
  key: string;
  label: string;
  color: string;
  values: number[];
  /** Segmentos empilhados na mesma barra; `values` deve ser a soma. */
  stacks?: FluxoReceitaStackSegment[];
};

type FluxoReceitaGroupedChartProps = {
  labels: string[];
  series: FluxoReceitaSerie[];
  height?: number;
};

const PADDING = { top: 24, right: 24, left: 88, bottom: 52 };
const BAR_WIDTH = 16;
const BAR_GAP = 3;
const GROUP_PADDING = 20;
const CHART_HEIGHT = 440;
const MIN_HIT_HEIGHT = 28;

type BarTooltip = {
  serie: string;
  mes: string;
  value: number;
  color: string;
  detail?: string;
  clientX: number;
  clientY: number;
};

type ChartBarSegment = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  value: number;
  mes: string;
  serie: string;
  detail?: string;
  totalH: number;
  totalY: number;
  totalValue: number;
};

function formatMoney(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatAxisValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
}

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

/** Ex.: 2026-06 → jun/26 */
export function formatMesLabel(mes: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes.trim());
  if (!match) return mes;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return mes;
  return `${MESES_CURTOS[monthIndex]}/${match[1].slice(-2)}`;
}

export function FluxoReceitaGroupedChart({
  labels,
  series,
  height = CHART_HEIGHT,
}: FluxoReceitaGroupedChartProps) {
  const [tooltip, setTooltip] = useState<BarTooltip | null>(null);

  const chart = useMemo(() => {
    if (labels.length === 0 || series.length === 0) {
      return null;
    }

    const seriesCount = series.length;
    const groupWidth =
      seriesCount * BAR_WIDTH + BAR_GAP * (seriesCount - 1) + GROUP_PADDING;
    const width = PADDING.left + PADDING.right + labels.length * groupWidth;

    const maxVal = Math.max(
      1,
      ...series.flatMap((s) =>
        labels.map((_, gi) => {
          if (s.stacks?.length) {
            return s.stacks.reduce((sum, st) => sum + Math.abs(st.values[gi] ?? 0), 0);
          }
          return Math.abs(s.values[gi] ?? 0);
        }),
      ),
    );

    const innerH = height - PADDING.top - PADDING.bottom;
    const yScale = (v: number) => PADDING.top + innerH - (v / maxVal) * innerH;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: PADDING.top + innerH * (1 - t),
      label: formatAxisValue(maxVal * t),
    }));

    const bars: ChartBarSegment[] = [];
    labels.forEach((_, gi) => {
      series.forEach((s, si) => {
        const groupX = PADDING.left + gi * groupWidth + GROUP_PADDING / 2;
        const x = groupX + si * (BAR_WIDTH + BAR_GAP);
        const mes = labels[gi]!;

        if (s.stacks?.length) {
          const stackValues = s.stacks.map((st) => Math.max(0, st.values[gi] ?? 0));
          const total = stackValues.reduce((a, b) => a + b, 0);
          if (total <= 0) return;
          const totalY = yScale(total);
          const totalH = Math.max(2, PADDING.top + innerH - totalY);
          let cumulative = 0;
          s.stacks.forEach((st, sti) => {
            const v = stackValues[sti]!;
            if (v <= 0) return;
            const from = cumulative;
            cumulative += v;
            const yTop = yScale(cumulative);
            const yBottom = yScale(from);
            const h = Math.max(1, yBottom - yTop);
            bars.push({
              key: `${gi}-${s.key}-${st.key}`,
              x,
              y: yTop,
              w: BAR_WIDTH,
              h,
              color: st.color,
              value: v,
              mes,
              serie: s.label,
              detail: st.label,
              totalH,
              totalY,
              totalValue: total,
            });
            void sti;
          });
          return;
        }

        const v = Math.max(0, s.values[gi] ?? 0);
        if (v <= 0) return;
        const y = yScale(v);
        const h = Math.max(2, PADDING.top + innerH - y);
        bars.push({
          key: `${gi}-${s.key}`,
          x,
          y,
          w: BAR_WIDTH,
          h,
          color: s.color,
          value: v,
          mes,
          serie: s.label,
          totalH: h,
          totalY: y,
          totalValue: v,
        });
      });
    });

    const hitByBar = new Map<string, ChartBarSegment>();
    for (const bar of bars) {
      const barKey = `${bar.mes}|${bar.serie}|${bar.x}`;
      const existing = hitByBar.get(barKey);
      if (!existing || bar.totalValue >= existing.totalValue) {
        hitByBar.set(barKey, bar);
      }
    }

    return {
      width,
      gridLines,
      bars,
      groupWidth,
      innerH,
      hitAreas: [...hitByBar.values()],
    };
  }, [labels, series, height]);

  const showTooltip = (bar: ChartBarSegment, clientX: number, clientY: number) => {
    setTooltip({
      serie: bar.serie,
      mes: bar.mes,
      value: bar.value,
      color: bar.color,
      detail: bar.detail,
      clientX,
      clientY,
    });
  };

  if (!chart) {
    return (
      <p className="py-12 text-center text-sm text-white/30">Sem dados para exibir.</p>
    );
  }

  const labelY = height - 20;

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 pb-2 [scrollbar-gutter:stable]">
        <svg
          width={chart.width}
          height={height}
          className="block overflow-visible"
          role="img"
          aria-label="Gráfico de fluxo de receita por mês"
        >
          {chart.gridLines.map((line) => (
            <g key={line.y}>
              <line
                x1={PADDING.left}
                x2={chart.width - PADDING.right}
                y1={line.y}
                y2={line.y}
                stroke="rgba(255,255,255,0.08)"
              />
              <text
                x={PADDING.left - 10}
                y={line.y + 4}
                textAnchor="end"
                className="fill-white/35 text-[11px]"
              >
                {line.label}
              </text>
            </g>
          ))}

          {chart.hitAreas.map((bar) => {
            const hitH = Math.max(bar.totalH, MIN_HIT_HEIGHT);
            const hitY = PADDING.top + chart.innerH - hitH;
            return (
              <rect
                key={`hit-${bar.key}`}
                x={bar.x}
                y={hitY}
                width={bar.w}
                height={hitH}
                fill="transparent"
                className="cursor-default"
              />
            );
          })}

          {chart.bars.map((bar) => (
            <g
              key={bar.key}
              className="cursor-default"
              onMouseEnter={(e) => showTooltip(bar, e.clientX, e.clientY)}
              onMouseMove={(e) => showTooltip(bar, e.clientX, e.clientY)}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.w}
                height={bar.h}
                rx={bar.detail && Math.abs(bar.y - bar.totalY) < 0.5 ? 3 : 0}
                fill={bar.color}
                opacity={0.92}
              />
            </g>
          ))}

          {labels.map((mes, i) => {
            const x = PADDING.left + i * chart.groupWidth + chart.groupWidth / 2;
            return (
              <text
                key={`${mes}-${i}`}
                x={x}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="hanging"
                className="fill-white/55 text-[11px] font-medium"
              >
                {formatMesLabel(mes)}
              </text>
            );
          })}
        </svg>
      </div>
      {labels.length > 8 ? (
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-white/25">
          Deslize horizontalmente para ver todos os meses
        </p>
      ) : null}

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-[200] max-w-[min(90vw,22rem)] rounded-xl border border-white/20 bg-zinc-950/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
          style={{
            left: Math.min(
              tooltip.clientX + 12,
              typeof window !== "undefined" ? window.innerWidth - 280 : tooltip.clientX + 12,
            ),
            top: Math.max(8, tooltip.clientY - 72),
          }}
          role="tooltip"
        >
          <p className="text-[13px] font-medium uppercase tracking-wide text-white/50">
            {tooltip.serie}
            {tooltip.detail ? (
              <span className="text-white/35"> · {tooltip.detail}</span>
            ) : null}
          </p>
          <p className="mt-1 text-[15px] text-white/80">{formatMesLabel(tooltip.mes)}</p>
          <p
            className="mt-2 font-mono text-[22px] font-semibold leading-tight"
            style={{ color: tooltip.color }}
          >
            {formatMoney(tooltip.value)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const FLUXO_RECEITA_SERIES: Omit<FluxoReceitaSerie, "values" | "stacks">[] = [
  { key: "recebidoLiquido", label: "Recebido líquido", color: "#34d399" },
  { key: "emitido", label: "A vencer", color: "#60a5fa" },
  { key: "inadimplencia", label: "Inadimplência", color: "#fb7185" },
  { key: "taxas", label: "Taxas", color: "#fbbf24" },
];

export const FLUXO_RECEITA_RECEBIDO_STACKS = [
  {
    key: "recebidoMesmoVencimento",
    label: "Vencimento no mês",
    color: "#34d399",
  },
  {
    key: "recebidoOutroVencimento",
    label: "Outros vencimentos",
    color: "#059669",
  },
] as const;
