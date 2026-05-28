"use client";

import { CrmFunilAcoesConfig } from "@/components/dashboard/CrmFunilAcoesConfig";
import { CrmFunilGate } from "@/components/dashboard/CrmFunilGate";

export default function CrmFunilAcoesPage() {
  return (
    <CrmFunilGate loadingLabel="Abrindo configuração">
      <div className="px-4 py-5 md:px-6 md:py-6">
        <CrmFunilAcoesConfig />
      </div>
    </CrmFunilGate>
  );
}
