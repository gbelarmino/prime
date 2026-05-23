import { apiFetch } from "./api-fetch";
import {
  getDashboardInadimplenciaUrl,
  getDashboardPorEmpreendimentoUrl,
} from "./api-config";

export type DashboardInadimplenciaEmpreendimento = {
  empreendimento: string;
  quantidadeTitulos: number;
  valorTotal: number;
};

export type DashboardInadimplencia = {
  valorTotal: number;
  quantidadeTitulos: number;
  porEmpreendimento: DashboardInadimplenciaEmpreendimento[];
};

export type DashboardEmpreendimentoStatsRow = {
  empreendimento: string;
  lotesDisponiveis: number;
  lotesEmNegociacao: number;
  leadsAtivos: number;
  volumeMensal: number;
  vendasMensal: number;
  inadimplenciaValor: number;
  inadimplenciaTitulos: number;
};

export type DashboardPorEmpreendimento = {
  totais: DashboardEmpreendimentoStatsRow;
  porEmpreendimento: DashboardEmpreendimentoStatsRow[];
};

function parseRow(raw: Record<string, unknown>): DashboardEmpreendimentoStatsRow {
  return {
    empreendimento: String(raw.empreendimento ?? ""),
    lotesDisponiveis: Number(raw.lotesDisponiveis ?? 0),
    lotesEmNegociacao: Number(raw.lotesEmNegociacao ?? 0),
    leadsAtivos: Number(raw.leadsAtivos ?? 0),
    volumeMensal: Number(raw.volumeMensal ?? 0),
    vendasMensal: Number(raw.vendasMensal ?? 0),
    inadimplenciaValor: Number(raw.inadimplenciaValor ?? 0),
    inadimplenciaTitulos: Number(raw.inadimplenciaTitulos ?? 0),
  };
}

export const dashboardService = {
  async getPorEmpreendimento(): Promise<DashboardPorEmpreendimento> {
    const res = await apiFetch(getDashboardPorEmpreendimentoUrl());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Falha ao carregar estatísticas por empreendimento.");
    }
    const data = (await res.json()) as {
      totais: Record<string, unknown>;
      porEmpreendimento: Array<Record<string, unknown>>;
    };
    return {
      totais: parseRow(data.totais),
      porEmpreendimento: (data.porEmpreendimento ?? []).map(parseRow),
    };
  },

  async getInadimplencia(): Promise<DashboardInadimplencia> {
    const res = await apiFetch(getDashboardInadimplenciaUrl());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Falha ao carregar inadimplência.");
    }
    const data = (await res.json()) as {
      valorTotal: number | string;
      quantidadeTitulos: number;
      porEmpreendimento: Array<{
        empreendimento: string;
        quantidadeTitulos: number;
        valorTotal: number | string;
      }>;
    };
    return {
      valorTotal: Number(data.valorTotal),
      quantidadeTitulos: data.quantidadeTitulos ?? 0,
      porEmpreendimento: (data.porEmpreendimento ?? []).map((row) => ({
        empreendimento: row.empreendimento,
        quantidadeTitulos: row.quantidadeTitulos ?? 0,
        valorTotal: Number(row.valorTotal),
      })),
    };
  },
};
