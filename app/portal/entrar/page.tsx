import { redirect } from "next/navigation";

/** Login unificado na landing `/portal`. */
export default function PortalEntrarRedirectPage() {
  redirect("/portal");
}
