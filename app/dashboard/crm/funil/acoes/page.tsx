"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CrmFunilAcoesConfig } from "@/components/dashboard/CrmFunilAcoesConfig";
import { isCrmFunilEnabled } from "@/lib/crm-service";

export default function CrmFunilAcoesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await isCrmFunilEnabled();
        if (cancelled) return;
        if (!ok) {
          router.replace("/dashboard/inicio");
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) router.replace("/dashboard/inicio");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400/90" strokeWidth={2} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">
          Abrindo configuração
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      <CrmFunilAcoesConfig />
    </div>
  );
}
