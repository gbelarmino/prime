"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { getPortalToken } from "@/lib/portal-auth-storage";
import { portalListarContratos, portalContratoPdfUrl, type PortalContrato } from "@/lib/portal-service";
import {
  PortalAlert,
  PortalBadge,
  PortalCard,
  PortalEmpty,
  PortalPageHeader,
  PortalSkeleton,
} from "@/lib/portal-ui";

export default function PortalContratosPage() {
  const [contratos, setContratos] = useState<PortalContrato[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [baixando, setBaixando] = useState<number | null>(null);

  useEffect(() => {
    portalListarContratos()
      .then(setContratos)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  function baixarPdf(contratoId: number) {
    setBaixando(contratoId);
    const token = getPortalToken();
    fetch(portalContratoPdfUrl(contratoId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
        toast.success("Contrato aberto em nova aba");
      })
      .catch(() => setErro("PDF do contrato indisponível"))
      .finally(() => setBaixando(null));
  }

  return (
    <>
      <PortalPageHeader
        title="Contratos"
        description="Documentos assinados do seu loteamento, prontos para download."
      />

      {loading ? (
        <div className="space-y-3">
          <PortalSkeleton className="h-28 w-full" />
          <PortalSkeleton className="h-28 w-full" />
        </div>
      ) : erro ? (
        <PortalAlert tone="error">{erro}</PortalAlert>
      ) : contratos.length === 0 ? (
        <PortalEmpty
          icon="pi-file"
          title="Nenhum contrato disponível"
          description="Contratos assinados aparecerão aqui assim que forem finalizados pela imobiliária."
        />
      ) : (
        <ul className="space-y-4">
          {contratos.map((c, i) => {
            const local = [c.empreendimento, c.quadra && `Quadra ${c.quadra}`, c.lote && `Lote ${c.lote}`]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={c.id} className="portal-animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <PortalCard>
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent-glow)] text-[var(--portal-accent)]">
                      <i className="pi pi-file-pdf text-xl" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-[family-name:var(--font-portal-display)] font-semibold text-[var(--portal-text)]">
                          {c.numeroContrato || `Contrato #${c.id}`}
                        </h3>
                        <PortalBadge tone="accent">{c.status}</PortalBadge>
                      </div>
                      {local ? (
                        <p className="mt-1 text-sm text-[var(--portal-text-muted)]">{local}</p>
                      ) : null}
                      <Button
                        label="Baixar PDF assinado"
                        loading={baixando === c.id}
                        className="portal-btn-primary mt-4"
                        icon="pi pi-download"
                        iconPos="right"
                        size="small"
                        onClick={() => baixarPdf(c.id)}
                      />
                    </div>
                  </div>
                </PortalCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
