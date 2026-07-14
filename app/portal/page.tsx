"use client";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { APP_BRAND_NAME } from "@/lib/app-brand";

/** Landing + login no mesmo padrão visual do meuloteamento admin/login. */
export default function PortalLandingPage() {
  return (
    <PortalAuthShell
      badge="Acesso restrito"
      title="Entre na sua conta"
      subtitle={`Use seu CPF e o código enviado ao celular cadastrado na ${APP_BRAND_NAME}.`}
    >
      <PortalLoginForm />
    </PortalAuthShell>
  );
}
