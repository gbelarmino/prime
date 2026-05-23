"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isPortalAuthenticated } from "@/lib/portal-auth-storage";
import { isPortalProtectedPath, isPortalPublicPath } from "@/lib/portal-public-routes";
import { PortalAppShell } from "@/components/portal/PortalAppShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isPublic = isPortalPublicPath(pathname);
  const isProtected = isPortalProtectedPath(pathname);

  useEffect(() => {
    setReady(true);
    if (isProtected && !isPortalAuthenticated()) {
      router.replace("/portal");
    }
  }, [isProtected, router]);

  if (!ready) {
    return <div className="min-h-screen bg-[var(--portal-bg)]" />;
  }

  if (isPublic) {
    return <>{children}</>;
  }

  return <PortalAppShell>{children}</PortalAppShell>;
}
