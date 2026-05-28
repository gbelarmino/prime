"use client";

import { CrmFunilGatilhos } from "@/components/dashboard/CrmFunilGatilhos";
import { CrmFunilGate } from "@/components/dashboard/CrmFunilGate";

export default function CrmFunilGatilhosPage() {
  return (
    <CrmFunilGate loadingLabel="Abrindo gatilhos">
      <CrmFunilGatilhos />
    </CrmFunilGate>
  );
}
