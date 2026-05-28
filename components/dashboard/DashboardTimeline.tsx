"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  FileText, 
  CheckCircle, 
  PenTool, 
  XCircle, 
  Trash2, 
  Send, 
  FileSignature,
  Banknote,
  Clock,
  User,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { getDashboardAtividadesUrl } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Atividade = {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string;
  usuario: string;
  dataHora: string;
  referenciaId: number | null;
  referenciaUuid: string | null;
  referenciaTipo: string;
  icone: string;
  cor: string;
};

const iconMap: Record<string, any> = {
  FileText,
  CheckCircle,
  PenTool,
  XCircle,
  Trash2,
  Send,
  FileSignature,
  Banknote,
  UserPlus,
};

export function DashboardTimeline() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fetchingPage = useRef<number | null>(null);

  const fetchAtividades = useCallback(async (pageNum: number, isInitial = false) => {
    if (fetchingPage.current === pageNum && !isInitial) return;
    fetchingPage.current = pageNum;

    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await apiFetch(getDashboardAtividadesUrl(pageNum, 20));
      if (res.ok) {
        const data = await res.json();
        const items = data.content || [];
        const totalElements = data.totalElements || 0;
        
        setTotal(totalElements);
        
        if (items.length < 20 || (pageNum * 20 + items.length) >= totalElements) {
          setHasMore(false);
        }
        
        setAtividades(prev => {
          if (isInitial) return items;
          // Evitar duplicados por ID
          const existingIds = new Set(prev.map(a => a.id));
          const newItems = items.filter((a: Atividade) => !existingIds.has(a.id));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error("Erro ao carregar atividades do dashboard", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingPage.current = null;
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchAtividades(0, true);
  }, [fetchAtividades]);

  // Observer para Scroll Infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchAtividades(nextPage);
        }
      },
      { 
        root: scrollContainerRef.current,
        threshold: 0.1 
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchAtividades]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-[600px] shadow-2xl">
      {/* Header do Card */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Clock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">Atividades do Sistema</h3>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black text-white/40 border border-white/5">
                {atividades.length} / {total}
              </span>
            </div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Feed em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Área Scrollable */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {atividades.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <Clock className="text-white/5 mb-4" size={64} />
            <p className="text-white/20 font-bold tracking-tight">Nenhuma atividade registrada ainda.</p>
          </div>
        ) : (
          <div className="relative pl-8 space-y-8">
            {/* Linha Vertical da Timeline */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent" />

            {atividades.map((atividade, idx) => {
              const Icon = iconMap[atividade.icone] || FileText;
              const corMap: Record<string, string> = {
                blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                gray: "text-white/40 bg-white/5 border-white/10",
                violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
              };
              const corEstilo = corMap[atividade.cor] || corMap.blue;

              return (
                <div key={`${atividade.id}-${idx}`} className="group relative">
                  {/* Marcador da Timeline */}
                  <div className={cn(
                    "absolute -left-[31px] top-1 z-10 w-[23px] h-[23px] rounded-full flex items-center justify-center border shadow-xl transition-transform group-hover:scale-125 duration-300",
                    corEstilo,
                    "bg-zinc-950" // Fundo sólido para sobrepor a linha
                  )}>
                    <Icon size={12} />
                  </div>

                  {/* Conteúdo do Evento */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-black text-white group-hover:text-blue-400 transition-colors">
                        {atividade.titulo}
                      </span>
                      <span className="text-[10px] font-bold text-white/20 whitespace-nowrap">
                        {formatDistanceToNow(new Date(atividade.dataHora), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                      {atividade.descricao}
                    </p>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <User size={10} className="text-white/20" />
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{atividade.usuario}</span>
                      </div>
                      
                      {atividade.referenciaTipo === "CONTRATO" && atividade.referenciaId != null && (
                        <a 
                          href={`/dashboard/contratos?id=${atividade.referenciaId}`}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-400/40 hover:text-blue-400 uppercase tracking-widest transition-all"
                        >
                          Detalhes <ArrowRight size={10} />
                        </a>
                      )}
                      {atividade.referenciaTipo === "TITULO" && atividade.referenciaUuid && (
                        <a 
                          href={`/dashboard/financeiro/titulos/detalhe?id=${atividade.referenciaUuid}`}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-400/40 hover:text-emerald-400 uppercase tracking-widest transition-all"
                        >
                          Ver título <ArrowRight size={10} />
                        </a>
                      )}
                      {atividade.referenciaTipo === "LEAD" && atividade.referenciaId != null && (
                        <a
                          href="/dashboard/crm/funil"
                          className="flex items-center gap-1 text-[10px] font-bold text-violet-400/40 hover:text-violet-400 uppercase tracking-widest transition-all"
                        >
                          Funil CRM <ArrowRight size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Sentinel para Scroll Infinito */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center pt-4">
                {!hasMore && (
                <div className="h-px w-full bg-white/5 relative">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d0d0d] px-4 text-[9px] font-black text-white/10 uppercase tracking-[0.3em] whitespace-nowrap">
                    Fim do Histórico
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
