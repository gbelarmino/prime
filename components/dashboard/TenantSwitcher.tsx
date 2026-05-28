"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTenantId, getTenantSlug } from "@/lib/auth-storage";
import { fetchMyTenants, switchTenant, type TenantResumo } from "@/lib/tenant-api";

type TenantSwitcherProps = {
  className?: string;
  /** Sidebar recolhida: só slug compacto sob/alinhado ao logo. */
  compact?: boolean;
};

export function TenantSwitcher({ className, compact = false }: TenantSwitcherProps) {
  const [tenants, setTenants] = useState<TenantResumo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const activeId = getTenantId();
  const activeSlug = getTenantSlug();

  useEffect(() => {
    let cancelled = false;
    void fetchMyTenants()
      .then((list) => {
        if (!cancelled) setTenants(list);
      })
      .catch(() => {
        if (!cancelled) setTenants([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelect = useCallback(async (tenant: TenantResumo) => {
    if (tenant.id === activeId) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const ok = await switchTenant(tenant.id);
      if (!ok) {
        toast.error("Não foi possível trocar de organização.");
        return;
      }
      toast.success(`Organização: ${tenant.nome}`);
      window.location.reload();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [activeId]);

  const label = activeSlug ?? tenants.find((t) => t.id === activeId)?.slug ?? "—";
  const single = tenants.length <= 1;

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => !single && setOpen((v) => !v)}
        className={cn(
          "flex items-center border border-white/10 bg-white/5 text-white/80 transition-colors",
          compact
            ? "w-full justify-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            : "gap-1.5 rounded-lg px-2 py-1 text-xs",
          !single && "hover:bg-white/10 hover:text-white",
          single && "cursor-default",
        )}
        title={tenants.find((t) => t.id === activeId)?.nome ?? label}
      >
        {!compact && <Building2 size={14} className="shrink-0 text-blue-400" />}
        <span className={cn("truncate font-medium", compact ? "max-w-[4.5rem]" : "max-w-[5.5rem]")}>
          {label}
        </span>
        {!single && !compact && (
          <ChevronDown
            size={12}
            className={cn("shrink-0 text-white/40 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open && tenants.length > 1 && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#0a2540] py-1 shadow-xl">
            {tenants.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSelect(t)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                >
                  <span className="flex-1 truncate">
                    <span className="font-medium text-white">{t.nome}</span>
                    <span className="ml-1 text-xs text-white/40">({t.slug})</span>
                  </span>
                  {t.id === activeId && <Check size={16} className="shrink-0 text-emerald-400" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
