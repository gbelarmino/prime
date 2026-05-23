"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { portalListarParcelas, type PortalParcela } from "@/lib/portal-service";
import {
  PortalAlert,
  PortalBadge,
  PortalCard,
  PortalEmpty,
  PortalPageHeader,
  PortalSkeleton,
  formatPortalMoney,
  isPortalParcelaPaga,
  portalStatusLabel,
  portalVencimentoTexto,
} from "@/lib/portal-ui";

type Filtro = "todas" | "abertas" | "vencidas";

export default function PortalParcelasPage() {
  const [parcelas, setParcelas] = useState<PortalParcela[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    portalListarParcelas()
      .then(setParcelas)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(() => {
    if (filtro === "vencidas") return parcelas.filter((p) => p.vencido);
    if (filtro === "abertas") return parcelas.filter((p) => !p.vencido);
    return parcelas;
  }, [parcelas, filtro]);

  const resumo = useMemo(() => {
    const vencidas = parcelas.filter((p) => p.vencido);
    const total = parcelas.reduce((s, p) => s + p.valorNominal, 0);
    return { vencidas: vencidas.length, total };
  }, [parcelas]);

  const filtros: { id: Filtro; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "abertas", label: "Em dia" },
    { id: "vencidas", label: "Vencidas" },
  ];

  return (
    <>
      <PortalPageHeader
        title="Parcelas"
        description="Consulte vencimentos, pague com PIX ou baixe o boleto."
      />

      {loading ? (
        <div className="space-y-3">
          <PortalSkeleton className="h-24 w-full" />
          <PortalSkeleton className="h-20 w-full" />
          <PortalSkeleton className="h-20 w-full" />
        </div>
      ) : erro ? (
        <PortalAlert tone="error">{erro}</PortalAlert>
      ) : parcelas.length === 0 ? (
        <PortalEmpty
          icon="pi-inbox"
          title="Nenhuma parcela ainda"
          description="Quando houver títulos vinculados ao seu CPF, eles aparecerão aqui com opções de pagamento."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6 portal-animate-in">
            <div className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-4">
              <p className="text-xs text-[var(--portal-text-faint)] uppercase tracking-wider">Em aberto</p>
              <p className="mt-1 font-[family-name:var(--font-portal-display)] text-xl font-semibold text-[var(--portal-text)]">
                {formatPortalMoney(resumo.total)}
              </p>
            </div>
            <div className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-danger)]/25 bg-[var(--portal-danger-bg)] p-4">
              <p className="text-xs text-[var(--portal-danger)]/80 uppercase tracking-wider">Vencidas</p>
              <p className="mt-1 font-[family-name:var(--font-portal-display)] text-xl font-semibold text-[var(--portal-danger)]">
                {resumo.vencidas}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" role="tablist">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filtro === f.id
                    ? "bg-[var(--portal-accent-glow)] text-[var(--portal-accent)] border border-[var(--portal-accent)]/35"
                    : "bg-[var(--portal-surface)] text-[var(--portal-text-muted)] border border-[var(--portal-border)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtradas.length === 0 ? (
            <PortalEmpty
              icon="pi-filter"
              title="Nada neste filtro"
              description="Tente outra aba ou aguarde novos lançamentos."
              action={
                <Button label="Ver todas" className="portal-btn-ghost" onClick={() => setFiltro("todas")} />
              }
            />
          ) : (
            <ul className="space-y-3">
              {filtradas.map((p, i) => {
                const st = portalStatusLabel(p.status, p.vencido);
                const paga = isPortalParcelaPaga(p.status);
                return (
                  <li key={p.id} className="portal-animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                    <PortalCard
                      href={
                        paga
                          ? undefined
                          : `/portal/parcelas/pagar?id=${encodeURIComponent(p.id)}`
                      }
                    >
                      <div className="flex justify-between gap-3 items-start">
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--portal-text-faint)]">
                            {p.numeroContrato} · Parcela {p.numeroParcela}
                          </p>
                          <p className="mt-1 font-[family-name:var(--font-portal-display)] text-xl font-semibold text-[var(--portal-text)]">
                            {formatPortalMoney(p.valorNominal)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--portal-text-muted)]">
                            {portalVencimentoTexto(p.vencimento)}
                          </p>
                        </div>
                        <PortalBadge tone={st.tone}>{st.label}</PortalBadge>
                      </div>
                      {!paga ? (
                        <p className="mt-3 text-xs text-[var(--portal-accent)] font-medium flex items-center gap-1">
                          Ver formas de pagamento
                          <i className="pi pi-arrow-right text-[10px]" aria-hidden />
                        </p>
                      ) : null}
                    </PortalCard>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
