"use client";

import { CrmFunilKanban } from "@/components/dashboard/CrmFunilKanban";
import { CrmFunilGate } from "@/components/dashboard/CrmFunilGate";

export default function CrmFunilPage() {
  return (
    <CrmFunilGate>
      <div className="flex h-[calc(100vh-var(--dashboard-header-offset,4rem))] min-h-0 flex-col px-4 py-5 md:px-6 md:py-6">
        <CrmFunilKanban />
      </div>
    </CrmFunilGate>
  );
}
