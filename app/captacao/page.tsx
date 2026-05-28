"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  CrmCaptacaoPublicForm,
  type CaptacaoFormConfig,
} from "@/components/captacao/CrmCaptacaoPublicForm";

function CaptacaoPageContent() {
  const searchParams = useSearchParams();

  const config = useMemo((): CaptacaoFormConfig | null => {
    const tenant =
      searchParams.get("tenant")?.trim() ||
      searchParams.get("tenantSlug")?.trim() ||
      searchParams.get("org")?.trim();
    if (!tenant) return null;

    return {
      tenantSlug: tenant.toLowerCase(),
      campanhaSlug:
        searchParams.get("campanha")?.trim() ||
        searchParams.get("campanhaSlug")?.trim() ||
        undefined,
      empreendimentoDefault:
        searchParams.get("empreendimento")?.trim() ||
        searchParams.get("emp")?.trim() ||
        undefined,
      titulo: searchParams.get("titulo")?.trim() || undefined,
      subtitulo: searchParams.get("subtitulo")?.trim() || undefined,
      utmSource: searchParams.get("utm_source") ?? searchParams.get("utmSource") ?? undefined,
      utmMedium: searchParams.get("utm_medium") ?? searchParams.get("utmMedium") ?? undefined,
      utmCampaign:
        searchParams.get("utm_campaign") ?? searchParams.get("utmCampaign") ?? undefined,
      utmContent: searchParams.get("utm_content") ?? searchParams.get("utmContent") ?? undefined,
      utmTerm: searchParams.get("utm_term") ?? searchParams.get("utmTerm") ?? undefined,
    };
  }, [searchParams]);

  if (!config) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <h1 className="text-lg font-semibold text-white">Formulário indisponível</h1>
        <p className="mt-3 text-sm text-white/55">
          Informe o parâmetro <code className="text-amber-200">tenant</code> na URL, por exemplo:{" "}
          <code className="text-amber-200">/captacao?tenant=domus</code>
        </p>
        <p className="mt-4 text-xs text-white/35">
          Opcional: <code>campanha</code>, <code>empreendimento</code>, parâmetros UTM (
          <code>utm_source</code>, etc.).
        </p>
      </div>
    );
  }

  return <CrmCaptacaoPublicForm config={config} />;
}

export default function CaptacaoPublicPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020817] px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-white/40" role="status">
            A carregar formulário…
          </div>
        }
      >
        <CaptacaoPageContent />
      </Suspense>
    </main>
  );
}
