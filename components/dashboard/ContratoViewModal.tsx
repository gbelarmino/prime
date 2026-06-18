"use client";

import { useEffect, useState } from "react";
import { 
  X, 
  FileText, 
  User, 
  Building2, 
  Briefcase,
  MapPin, 
  Box, 
  DollarSign,
  Calendar,
  Clock,
  Info,
  ChevronRight,
  ShieldCheck,
  Percent
} from "lucide-react";
import Link from "next/link";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { apiFetch } from "@/lib/api-fetch";
import { getContratoHonorariosByIdUrl } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type { ContratoHonorariosApiResponse } from "@/lib/validations/contrato-honorarios";
import { canAccessContratoRenegociacao } from "@/lib/auth-storage";
import {
  buildRenegociacaoDashboardUrl,
  MODALIDADE_ATALHO_ADITIVO,
} from "@/lib/renegociacao-routes";

type Props = {
  contratoId: number | null;
  onClose: () => void;
};

export function ContratoViewModal({ contratoId, onClose }: Props) {
  const [data, setData] = useState<ContratoHonorariosApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contratoId) return;

    setLoading(true);
    void (async () => {
      try {
        const res = await apiFetch(getContratoHonorariosByIdUrl(contratoId), { skipLoading: true });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Erro ao carregar resumo do contrato:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [contratoId]);

  if (!contratoId) return null;

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "—";
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const statusConfigs: Record<string, { bg: string, text: string }> = {
    "1": { bg: "bg-blue-500/10", text: "text-blue-400" },      // PROPOSTA
    "2": { bg: "bg-amber-500/10", text: "text-amber-400" },    // REVISAO
    "3": { bg: "bg-indigo-500/10", text: "text-indigo-400" },   // APROVADO
    "4": { bg: "bg-rose-500/10", text: "text-rose-400" },      // REPROVADO
    "5": { bg: "bg-amber-500/10", text: "text-amber-400" },    // PROPOSTA ENVIADA
    "6": { bg: "bg-white/10", text: "text-white/30" },         // CANCELADO
    "7": { bg: "bg-blue-500/10", text: "text-blue-400" },      // EM ASSINATURA
    "8": { bg: "bg-emerald-500/20", text: "text-emerald-400" }, // ASSINADO
  };

  const statusLabels: Record<string, string> = {
    "1": "Proposta",
    "2": "Revisão",
    "3": "Aprovado",
    "4": "Reprovado",
    "5": "Proposta Enviada",
    "6": "Cancelado",
    "7": "Em Assinatura",
    "8": "Assinado",
  };

  const statusConfig = data?.status ? statusConfigs[String(data.status)] : statusConfigs["1"];

  const headerElement = (
    <div className="flex items-center gap-4 py-2">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5">
        <FileText size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white leading-tight">Resumo do Contrato</h3>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">
          {data?.numeroContrato || `Contrato #${contratoId}`}
        </p>
      </div>
    </div>
  );

  return (
    <DashboardDialog 
      visible={!!contratoId} 
      onHide={onClose}
      header={headerElement}
      className="w-full max-w-4xl mx-4"
      contentClassName="bg-[#020817] border-white/5 p-0 overflow-hidden"
      headerClassName="bg-[#020817] border-b border-white/5 p-6"
      pt={{
        root: { className: 'rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl' },
        mask: { className: 'backdrop-blur-md bg-black/60' },
        closeButton: { className: 'text-white/20 hover:text-white transition-colors mr-2' }
      }}
    >
      {loading ? (
        <div className="p-20 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Carregando resumo...</span>
        </div>
      ) : data ? (
        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Status e Info Geral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cn("p-6 rounded-[1.5rem] border flex flex-col gap-2", statusConfig?.bg, statusConfig?.text, statusConfig?.text.replace('text', 'border/20'))}>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status Atual</span>
              <span className="text-lg font-black uppercase tracking-wider">{data.status ? (statusLabels[String(data.status)] || data.status) : '—'}</span>
            </div>
            <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] flex flex-col gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Data Assinatura</span>
              <span className="text-lg font-bold text-white tabular-nums">{formatDate(data.dataAssinatura)}</span>
            </div>
            <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] flex flex-col gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Localização</span>
              <span className="text-lg font-bold text-white">{data.cidadeAssinatura} / {data.ufAssinatura}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Seção: Partes do Contrato */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <User size={12} /> Partes Envolvidas
              </h5>
              <div className="space-y-3">
                <EntityCard 
                  icon={<User size={18} className="text-blue-400" />} 
                  label="Comprador" 
                  name={data.contratante?.label || "—"} 
                />
                <EntityCard 
                  icon={<Building2 size={18} className="text-amber-400" />} 
                  label="Imobiliária" 
                  name={data.imobiliaria?.label || "—"} 
                />
                <EntityCard 
                  icon={<Briefcase size={18} className="text-emerald-400" />} 
                  label="Corretor" 
                  name={data.corretor?.label || "—"} 
                />
              </div>
            </div>

            {/* Seção: O Imóvel */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <MapPin size={12} /> Detalhes do Imóvel
              </h5>
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-400/20 shadow-lg">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none block mb-1">Empreendimento</span>
                    <span className="text-lg font-bold text-white">{data.imovel?.label?.split(' - ')[0] || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Quadra</span>
                    <span className="text-xl font-black text-white">
                      {data.imovel?.label?.match(/(?:Quadra|Q\.|Q)\s*(\w+)/i)?.[1] || "—"}
                    </span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Lote</span>
                    <span className="text-xl font-black text-white">
                      {data.imovel?.label?.match(/(?:Lote|Lt\.|Lt)\s*(\d+)/i)?.[1] || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Divider className="before:border-white/5" />

          {/* Seção: Financeiro */}
          <div className="space-y-6">
            <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <DollarSign size={12} /> Condições Financeiras
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PriceBox label="Valor do Lote" value={formatCurrency(data.condicoes?.valorLote)} highlight />
              <PriceBox label="Valor Negociação" value={formatCurrency(data.condicoes?.valorNegociacao)} />
              <PriceBox label="Corretagem" value={formatCurrency(data.condicoes?.valorComissaoCorretagem)} />
              <PriceBox label="Sinal (Entrada)" value={formatCurrency(data.condicoes?.valorHonorarioEntrada)} color="text-emerald-400" />
              <PriceBox label="Parc. Imobiliária" value={formatCurrency(data.condicoes?.valorFracionadoIntermediaria)} />
              <PriceBox label="Parc. Incorporadora" value={formatCurrency(data.condicoes?.valorFracionadoVendedora)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Clock size={16} />
                    </div>
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Parcelamento Mensal</span>
                  </div>
                  <span className="text-xl font-black text-white tabular-nums">{data.condicoes?.numParcelasMensais || 0}x</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Valor da Parcela</span>
                  <span className="text-lg font-black text-emerald-400 tabular-nums">{formatCurrency(data.condicoes?.valorParcela)}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Vencimento</span>
                  <span className="text-sm font-bold text-white/70 tracking-widest">Dia {data.condicoes?.diaVencimento || "—"}</span>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Percent size={16} />
                    </div>
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Correção e Juros</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400 uppercase tracking-tighter">{data.condicoes?.tipoCorrecaoAnual || "NENHUMA"}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Juros remuneratórios</span>
                  <span className="text-lg font-black text-white tabular-nums">{data.condicoes?.taxaJurosRemuneratorios ?? 6}%</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Periodicidade</span>
                  <span className="text-sm font-bold text-white/70 uppercase tracking-tighter">
                    {data.condicoes?.periodicidadeCorrecao?.replace(/_/g, ' ') || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {data.condicoes?.observacoes && (
            <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <Info size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Observações</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed italic">"{data.condicoes.observacoes}"</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 pb-8">
            {data.status === "8" && canAccessContratoRenegociacao() && contratoId && (
              <>
                <Link
                  href={buildRenegociacaoDashboardUrl({ contratoId })}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all no-underline text-sm"
                  onClick={onClose}
                >
                  Renegociar
                </Link>
                <Link
                  href={buildRenegociacaoDashboardUrl({
                    contratoId,
                    modalidade: MODALIDADE_ATALHO_ADITIVO,
                  })}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-all no-underline text-sm"
                  onClick={onClose}
                >
                  Aditivo (saldo devedor)
                </Link>
              </>
            )}
            <Button 
              label="Fechar" 
              onClick={onClose} 
              className="bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white px-8 py-3 rounded-2xl font-bold transition-all"
            />
          </div>
        </div>
      ) : (
        <div className="p-20 text-center text-rose-400">
          Não foi possível carregar os detalhes do contrato.
        </div>
      )}
    </DashboardDialog>
  );
}

function EntityCard({ icon, label, name }: { icon: any, label: string, name: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="text-sm font-bold text-white truncate">{name}</span>
      </div>
    </div>
  );
}

function PriceBox({ label, value, highlight = false, color = "text-white" }: { label: string, value: string, highlight?: boolean, color?: string }) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all flex flex-col items-center text-center gap-2",
      highlight ? "bg-blue-600/10 border-blue-600/30 shadow-lg shadow-blue-600/5" : "bg-white/[0.02] border-white/5"
    )}>
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em] leading-tight h-8 flex items-center">{label}</span>
      <span className={cn("text-lg font-black tabular-nums", color)}>{value}</span>
    </div>
  );
}
