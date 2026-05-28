"use client";

import { useEffect, useState } from "react";
import { isAdmin } from "@/lib/auth-storage";
import { isCrmFunilEnabled } from "@/lib/crm-service";

export function useCrmFunilEnabled(active = true): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!active || !isAdmin()) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    void isCrmFunilEnabled()
      .then((ok) => {
        if (!cancelled) setEnabled(ok);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return enabled;
}
