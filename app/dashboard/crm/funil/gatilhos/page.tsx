"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CrmFunilGatilhos } from "@/components/dashboard/CrmFunilGatilhos";
import { isAdmin } from "@/lib/auth-storage";

export default function CrmFunilGatilhosPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/dashboard/inicio");
    }
  }, [router]);

  if (!isAdmin()) {
    return null;
  }

  return <CrmFunilGatilhos />;
}
