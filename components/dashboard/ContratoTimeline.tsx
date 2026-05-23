"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { getContratoHistoricoUrl } from "@/lib/api-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type HistoricoItem = {
  id: number;
  dataHora: string;
  usuarioNome: string;
  situacaoAnterior: number | null;
  situacaoAnteriorLabel: string | null;
  situacaoNova: number;
  situacaoNovaLabel: string | null;
  observacao: string | null;
};

function StatusBadge({ status, label }: { status: number | null, label: string | null }) {
  if (!status) return <span className="text-white/20 text-[10px] font-bold uppercase tracking-wider">N/A</span>;
  
  const s = String(status);
  const text = label ?? "—";
  
  const configs: Record<string, { bg: string, text: string }> = {
    "1": { bg: "bg-blue-500/10", text: "text-blue-400" },          // PROPOSTA
    "2": { bg: "bg-amber-500/10", text: "text-amber-400" },        // REVISAO
    "3": { bg: "bg-emerald-500/10", text: "text-emerald-400" },    // APROVADO
    "4": { bg: "bg-rose-500/10", text: "text-rose-400" },          // REPROVADO
    "5": { bg: "bg-amber-500/10", text: "text-amber-400" },        // PROPOSTA ENVIADA
    "6": { bg: "bg-white/10", text: "text-white/40" },             // CANCELADO
  };

  const config = configs[s] || { bg: "bg-white/5", text: "text-white/60" };

  return (
    <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-current/10", config.bg, config.text)}>
      {text}
    </div>
  );
}

export function ContratoTimeline({ contratoId }: { contratoId: number }) {
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(getContratoHistoricoUrl(contratoId));
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contratoId]);


  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-white/30 text-sm italic">Nenhum registro de auditoria encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-[12px] before:w-px before:bg-gradient-to-b before:from-amber-500/20 before:via-white/5 before:to-transparent">
      {items.map((item, idx) => (
        <div key={item.id} className="relative flex items-start gap-6 pl-10 group">
          <div className="absolute left-0 mt-1.5 h-6 w-6 rounded-full bg-[#020817] border border-white/10 flex items-center justify-center z-10">
            <div className={cn("h-2 w-2 rounded-full transition-all duration-500 group-hover:scale-150", 
              idx === 0 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-white/20")} 
            />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.situacaoAnterior} label={item.situacaoAnteriorLabel} />
                <span className="text-white/20">→</span>
                <StatusBadge status={item.situacaoNova} label={item.situacaoNovaLabel} />
              </div>
              <time className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 tabular-nums">
                {format(new Date(item.dataHora), "dd MMM yyyy · HH:mm", { locale: ptBR })}
              </time>
            </div>
            
            <div className="rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-4 group-hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 uppercase">
                  {item.usuarioNome.charAt(0)}
                </div>
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider">{item.usuarioNome}</p>
              </div>
              {item.observacao && (
                <p className="text-sm text-white/60 italic leading-relaxed pl-7 border-l border-white/10 ml-2.5">
                  &quot;{item.observacao}&quot;
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
