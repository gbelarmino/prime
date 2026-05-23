"use client";

import { useEffect, useState } from "react";
import { 
  X, 
  Building2, 
  MapPin, 
  Box, 
  Maximize2,
  Tag,
  CheckCircle2,
  Ban,
  Clock,
  Eye,
  Calendar,
  DollarSign,
  Info
} from "lucide-react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { apiFetch } from "@/lib/api-fetch";
import { getImovelByIdUrl, getImovelPrecoUrl } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type { ImovelApiResponse } from "@/lib/validations/imovel";
import type { PrecoLoteResponse } from "@/lib/validations/contrato-honorarios";

type Props = {
  imovelId: number | null;
  onClose: () => void;
};

export function ImovelViewModal({ imovelId, onClose }: Props) {
  const [data, setData] = useState<ImovelApiResponse | null>(null);
  const [preco, setPreco] = useState<PrecoLoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imovelId) return;

    setLoading(true);
    void (async () => {
      try {
        const [resImovel, resPreco] = await Promise.all([
          apiFetch(getImovelByIdUrl(imovelId)),
          apiFetch(getImovelPrecoUrl(imovelId))
        ]);

        if (resImovel.ok) {
          setData(await resImovel.json());
        }
        
        if (resPreco.ok) {
          setPreco(await resPreco.json());
        } else {
          setPreco(null);
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes do imóvel:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [imovelId]);

  if (!imovelId) return null;

  const situacao = data?.situacao || 1;
  const situacaoLabel = data?.descricaoSituacao || "Disponível";
  
  const situacaoConfigs: Record<number, { bg: string, text: string, icon: any }> = {
    1: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle2 },
    2: { bg: "bg-rose-500/10", text: "text-rose-400", icon: Ban },
    3: { bg: "bg-blue-500/10", text: "text-blue-400", icon: Tag },
    4: { bg: "bg-amber-500/10", text: "text-amber-400", icon: Clock },
  };

  const config = situacaoConfigs[situacao] || situacaoConfigs[1];

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return null;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const headerElement = (
    <div className="flex items-center gap-4 py-2">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5">
        <Eye size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white leading-tight">Detalhes do Imóvel</h3>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">ID #{imovelId}</p>
      </div>
    </div>
  );

  return (
    <DashboardDialog 
      visible={!!imovelId} 
      onHide={onClose}
      header={headerElement}
      className="w-full max-w-2xl mx-4"
      contentClassName="bg-[#020817] border-white/5 p-0 overflow-hidden"
      headerClassName="bg-[#020817] border-b border-white/5 p-6"
      pt={{
        root: { className: 'rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300' },
        mask: { className: 'backdrop-blur-md bg-black/60' },
        closeButton: { className: 'text-white/20 hover:text-white transition-colors mr-2' }
      }}
    >
      {loading ? null : data ? (
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Cabeçalho do Imóvel */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-inner">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-400/20 shadow-lg">
                <Building2 size={32} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-2xl font-bold text-white leading-tight">{data.empreendimento}</h4>
                <div className="flex items-center gap-2 mt-2 text-white/40">
                  <MapPin size={14} />
                  <span className="text-sm">{data.cidade} - {data.uf}</span>
                </div>
              </div>
            </div>
            
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest border", config.bg, config.text, config.text.replace('text', 'border'))}>
              <config.icon size={14} />
              {situacaoLabel}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bloco: Localização Técnica */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">Identificação</h5>
              <div className="grid grid-cols-2 gap-4">
                <InfoBox icon={<Box size={18} className="text-blue-400" />} label="Quadra" value={data.quadra} />
                <InfoBox icon={<Box size={18} className="text-amber-400" />} label="Lote" value={data.lote} />
              </div>
            </div>

            {/* Bloco: Medidas */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">Dimensões</h5>
              <div className="grid grid-cols-1 gap-4">
                <InfoBox 
                  icon={<Maximize2 size={18} className="text-emerald-400" />} 
                  label="Área Total" 
                  value={data.area ? `${data.area.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : "—"} 
                />
              </div>
            </div>
          </div>

          {/* Valor de Tabela - Destaque */}
          <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-[1.5rem] p-6 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform">
                <DollarSign size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Valor de Tabela</span>
                <span className="text-2xl font-black text-white">
                  {formatCurrency(preco?.valorLote) || "Consulte-nos"}
                </span>
              </div>
            </div>
            
            {preco?.valorLote && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Parcela Estimada</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCurrency(preco?.valorParcela) || "—"}
                </span>
              </div>
            )}
          </div>

          <Divider className="before:border-white/5" />

          {/* Seção Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="flex items-start gap-4 p-4 bg-white/[0.01] rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                <Info size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Informações Adicionais</span>
                <p className="text-sm text-white/60 leading-relaxed">
                  Os valores apresentados estão sujeitos a alterações sem aviso prévio. A disponibilidade deve ser confirmada no momento da reserva.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              label="Fechar Detalhes" 
              onClick={onClose} 
              className="bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white px-8 py-3 rounded-2xl font-bold transition-all"
            />
          </div>
        </div>
      ) : (
        <div className="p-20 text-center text-rose-400">
          Não foi possível carregar os detalhes do imóvel.
        </div>
      )}
    </DashboardDialog>
  );
}

function InfoBox({ icon, label, value }: { icon: any, label: string, value: string | number | null | undefined }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="text-lg font-bold text-white leading-none">{value || "—"}</span>
      </div>
    </div>
  );
}
