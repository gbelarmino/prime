"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  LayoutGrid,
  Handshake,
  TrendingUp,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import {
  dashboardService,
  type DashboardEmpreendimentoStatsRow,
  type DashboardPorEmpreendimento,
} from "@/lib/dashboard-service";
import {
  DashboardMetricCarouselCard,
  type DashboardCarouselSlide,
} from "@/components/dashboard/DashboardMetricCarouselCard";

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

function buildSlides(
  totais: DashboardEmpreendimentoStatsRow,
  porEmpreendimento: DashboardEmpreendimentoStatsRow[],
  options: {
    pickValor: (row: DashboardEmpreendimentoStatsRow) => number | string;
    formatValor: (n: number) => string;
    pickSubtitulo?: (row: DashboardEmpreendimentoStatsRow) => string | undefined;
  },
): DashboardCarouselSlide[] {
  const slides: DashboardCarouselSlide[] = [
    {
      id: "total",
      titulo: totais.empreendimento,
      valor: options.formatValor(Number(options.pickValor(totais))),
      subtitulo: options.pickSubtitulo?.(totais),
      isTotal: true,
    },
  ];
  for (const row of porEmpreendimento) {
    slides.push({
      id: row.empreendimento,
      titulo: row.empreendimento,
      valor: options.formatValor(Number(options.pickValor(row))),
      subtitulo: options.pickSubtitulo?.(row),
    });
  }
  return slides;
}

export function DashboardStatsCarouselGrid() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardPorEmpreendimento | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService
      .getPorEmpreendimento()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : "Erro ao carregar estatísticas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totais = data?.totais;
  const porEmpreendimento = data?.porEmpreendimento ?? [];

  const lotesDisponiveisSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.lotesDisponiveis,
            formatValor: formatCount,
            pickSubtitulo: (r) =>
              r.lotesDisponiveis === 1 ? "lote disponível" : "lotes disponíveis",
          })
        : [],
    [totais, porEmpreendimento],
  );

  const negociacaoSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.lotesEmNegociacao,
            formatValor: formatCount,
            pickSubtitulo: (r) =>
              r.lotesEmNegociacao === 1 ? "lote em negociação" : "lotes em negociação",
          })
        : [],
    [totais, porEmpreendimento],
  );

  const leadsSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.leadsAtivos,
            formatValor: formatCount,
            pickSubtitulo: (r) =>
              r.leadsAtivos === 1 ? "lead ativo" : "leads ativos",
          })
        : [],
    [totais, porEmpreendimento],
  );

  const volumeSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.volumeMensal,
            formatValor: formatMoney,
            pickSubtitulo: () => "contratos assinados no mês",
          })
        : [],
    [totais, porEmpreendimento],
  );

  const inadimplenciaSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.inadimplenciaValor,
            formatValor: formatMoney,
            pickSubtitulo: (r) =>
              `${formatCount(r.inadimplenciaTitulos)} ${
                r.inadimplenciaTitulos === 1 ? "título vencido" : "títulos vencidos"
              }`,
          })
        : [],
    [totais, porEmpreendimento],
  );

  const vendasSlides = useMemo(
    () =>
      totais
        ? buildSlides(totais, porEmpreendimento, {
            pickValor: (r) => r.vendasMensal,
            formatValor: formatCount,
            pickSubtitulo: (r) =>
              r.vendasMensal === 1 ? "venda no mês" : "vendas no mês",
          })
        : [],
    [totais, porEmpreendimento],
  );

  const sharedError = error;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardMetricCarouselCard
        title="Lotes Disponíveis"
        description="Estoque livre para venda"
        icon={LayoutGrid}
        color="text-blue-400"
        slides={lotesDisponiveisSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhum lote disponível."
        linkHref="/dashboard/imoveis"
        linkLabel="Ver imóveis"
      />
      <DashboardMetricCarouselCard
        title="Em Negociação"
        description="Lotes reservados ou em proposta"
        icon={Handshake}
        color="text-amber-400"
        slides={negociacaoSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhum lote em negociação."
        linkHref="/dashboard/imoveis"
        linkLabel="Ver imóveis"
      />
      <DashboardMetricCarouselCard
        title="Leads Ativos"
        description="Contratantes com contrato em andamento"
        icon={Users}
        color="text-emerald-400"
        slides={leadsSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhum lead ativo."
        linkHref="/dashboard/clientes"
        linkLabel="Ver clientes"
      />
      <DashboardMetricCarouselCard
        title="Valor Contratos Negociados"
        description="Vendas assinadas no mês corrente"
        icon={TrendingUp}
        color="text-purple-400"
        slides={volumeSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhum contrato negociado neste mês."
        linkHref="/dashboard/contratos"
        linkLabel="Ver contratos"
      />
      <DashboardMetricCarouselCard
        title="Inadimplência"
        description="Títulos vencidos em aberto"
        icon={CreditCard}
        color="text-rose-400"
        slides={inadimplenciaSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhum título vencido no momento."
        linkHref="/dashboard/financeiro/titulos"
        linkLabel="Ver títulos"
      />
      <DashboardMetricCarouselCard
        title="Vendas no Mês"
        description="Lotes vendidos no período"
        icon={CheckCircle2}
        color="text-emerald-400"
        slides={vendasSlides}
        loading={loading}
        error={sharedError}
        emptyMessage="Nenhuma venda neste mês."
        linkHref="/dashboard/contratos"
        linkLabel="Ver contratos"
      />
    </div>
  );
}
