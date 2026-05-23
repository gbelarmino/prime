"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Banknote, BookOpen, Calendar, Home, Receipt } from "lucide-react";
import { finService, type FinImovelResumo } from "@/lib/fin-service";
import { TitulosList } from "@/components/dashboard/fin/TitulosList";

function formatMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function imovelTitulo(resumo: FinImovelResumo): string {
  const parts = [resumo.empreendimento];
  if (resumo.quadra) parts.push(`Quadra ${resumo.quadra}`);
  if (resumo.lote != null) parts.push(`Lote ${resumo.lote}`);
  return parts.join(" · ");
}

function ResumoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Home;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        <Icon size={14} className="text-blue-400/80" />
        {label}
      </div>
      <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function ImovelFinanceiroDetalhe({ imovelId }: { imovelId: number }) {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<FinImovelResumo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await finService.getResumoImovel(imovelId);
      setResumo(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar resumo do imóvel.");
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }, [imovelId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="px-4 py-16 text-center text-sm font-medium text-white/30 animate-pulse">
        Carregando resumo financeiro…
      </div>
    );
  }

  if (!resumo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="max-w-sm rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <p className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-bold text-rose-200">
            Imóvel não encontrado
          </p>
          <p className="mb-6 text-sm text-white/40">
            Não há movimentação financeira registrada para este imóvel.
          </p>
          <Link
            href="/dashboard/financeiro/por-imovel"
            className="inline-block rounded-xl bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white no-underline transition hover:bg-white/20"
          >
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  const periodo =
    resumo.primeiraCompetencia || resumo.ultimaCompetencia
      ? resumo.primeiraCompetencia === resumo.ultimaCompetencia
        ? formatDate(resumo.primeiraCompetencia)
        : `${formatDate(resumo.primeiraCompetencia)} – ${formatDate(resumo.ultimaCompetencia)}`
      : "—";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 px-4">
        <Link
          href="/dashboard/financeiro/por-imovel"
          className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft size={14} />
          Por imóvel
        </Link>

        <div>
          <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">
            <Home size={14} />
            Resumo financeiro
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">
            {imovelTitulo(resumo)}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/40">
            {resumo.contratanteNome ? (
              <>
                Cliente: <span className="text-white/70">{resumo.contratanteNome}</span>
                {resumo.numeroContrato ? (
                  <>
                    {" "}
                    · Contrato{" "}
                    <span className="font-mono text-white/70">{resumo.numeroContrato}</span>
                  </>
                ) : null}
              </>
            ) : (
              "Lançamentos e recebimentos consolidados deste imóvel."
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard label="Total recebido" value={formatMoney(resumo.totalRecebido)} icon={Banknote} />
        <ResumoCard
          label="Lançamentos"
          value={String(resumo.totalLancamentos)}
          icon={BookOpen}
        />
        <ResumoCard
          label="Pagamentos"
          value={String(resumo.totalPagamentos)}
          icon={Receipt}
        />
        <ResumoCard label="Período" value={periodo} icon={Calendar} />
      </div>

      <div className="flex flex-col gap-4 px-4">
        <h2 className="text-lg font-bold text-white">Títulos deste imóvel</h2>
        <TitulosList imovelId={imovelId} embedded />
      </div>
    </div>
  );
}
