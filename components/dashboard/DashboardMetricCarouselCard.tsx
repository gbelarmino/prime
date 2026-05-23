"use client";

import Link from "next/link";
import { Carousel, type CarouselPassThroughMethodOptions } from "primereact/carousel";
import { Card } from "primereact/card";
import { ChevronRight, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardCarouselSlide = {
  id: string;
  titulo: string;
  valor: string;
  subtitulo?: string;
  isTotal?: boolean;
};

type DashboardMetricCarouselCardProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  slides: DashboardCarouselSlide[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  linkHref?: string;
  linkLabel?: string;
};

export function DashboardMetricCarouselCard({
  title,
  description,
  icon: Icon,
  color,
  slides,
  loading = false,
  error = null,
  emptyMessage = "Sem dados para exibir.",
  linkHref,
  linkLabel = "Ver detalhes",
}: DashboardMetricCarouselCardProps) {
  const itemTemplate = (item: DashboardCarouselSlide) => (
    <div className="flex min-h-[7.5rem] flex-col justify-between px-1 py-1">
      <div>
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            item.isTotal ? "text-white/55" : "text-white/45",
          )}
        >
          {item.isTotal ? "Visão geral" : "Empreendimento"}
        </p>
        <p
          className={cn(
            "mt-2 line-clamp-2 font-semibold leading-snug text-white",
            item.isTotal ? "text-lg" : "text-base",
          )}
          title={item.titulo}
        >
          {item.titulo}
        </p>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tabular-nums text-white">{item.valor}</p>
        {item.subtitulo ? (
          <p className="mt-2 text-xs text-white/45">{item.subtitulo}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card
      className="border-white/10 bg-white/5 transition-all hover:border-white/20"
      pt={{ body: { className: "p-6" } }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg bg-white/5 p-2", color)}>
            <Icon size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {title}
            </span>
            {description ? (
              <p className="mt-0.5 text-xs text-white/35">{description}</p>
            ) : null}
          </div>
        </div>
        {linkHref ? (
          <Link
            href={linkHref}
            className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/50 no-underline transition hover:text-white/80"
          >
            {linkLabel}
            <ChevronRight size={12} />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[7.5rem] items-center justify-center text-sm text-white/35 animate-pulse">
          Carregando…
        </div>
      ) : error ? (
        <div className="flex min-h-[7.5rem] items-center text-sm text-rose-300/80">{error}</div>
      ) : slides.length === 0 ? (
        <div className="flex min-h-[7.5rem] flex-col justify-center text-sm text-white/45">
          {emptyMessage}
        </div>
      ) : (
        <Carousel
          value={slides}
          itemTemplate={itemTemplate}
          numVisible={1}
          numScroll={1}
          circular={slides.length > 1}
          showIndicators={slides.length > 1}
          showNavigators={false}
          className="dashboard-metric-carousel"
          pt={{
            root: { className: "w-full" },
            content: { className: "bg-transparent flex flex-col" },
            container: { className: "bg-transparent" },
            indicators: {
              className:
                "dashboard-metric-carousel-indicators flex list-none flex-row flex-wrap justify-center gap-2 p-0 m-0 mt-4",
            },
            indicator: { className: "flex items-center" },
            indicatorButton: (options?: CarouselPassThroughMethodOptions) => ({
              className: cn(
                "block shrink-0 rounded-full border-0 p-0 transition-all duration-200",
                options?.context?.active
                  ? "h-2 w-5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]"
                  : "h-2 w-2 bg-white/30 hover:bg-white/45",
              ),
            }),
          }}
        />
      )}

      <div className="mt-4 flex items-center gap-1 text-[9px] uppercase tracking-tighter text-white/30">
        <Clock size={10} /> Atualizado agora
      </div>
    </Card>
  );
}
