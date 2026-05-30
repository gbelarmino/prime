"use client";

import Link from "next/link";
import { FileSignature } from "lucide-react";
import { ClicksignList } from "@/components/dashboard/ClicksignList";
import { ClicksignPdfResyncCard } from "@/components/dashboard/ClicksignPdfResyncCard";

export default function ClicksignPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400 mb-2">
            Integração Digital
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
            Portal Clicksign
          </h1>
          <p className="text-white/40 mt-1 max-w-xl leading-relaxed font-medium">
            Consulte o status de envelopes, documentos e acompanhe o fluxo de assinaturas digitais diretamente da API v3.
          </p>
        </div>
        <Link
          href="/dashboard/clicksign/termo-assinatura"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 transition shrink-0"
        >
          <FileSignature className="h-4 w-4" />
          Termo assinatura automática
        </Link>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
        <ClicksignPdfResyncCard />
      </div>

      {/* Listagem */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <ClicksignList />
      </div>
    </div>
  );
}
