"use client";

import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import { ClicksignAutoSignatureTermForm } from "@/components/dashboard/ClicksignAutoSignatureTermForm";

export default function ClicksignTermoAssinaturaPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
            <FileSignature className="h-3.5 w-3.5" />
            Assinatura automática
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
            Termo de assinatura automática
          </h1>
          <p className="text-white/40 mt-1 max-w-2xl leading-relaxed font-medium">
            Cadastra um signatário na Clicksign (API v3{" "}
            <code className="text-white/50 text-xs">POST /auto_signature/terms</code>) com nome,
            e-mail, CPF e data de nascimento.
          </p>
        </div>
        <Link
          href="/dashboard/clicksign"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao portal
        </Link>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 px-4">
        <ClicksignAutoSignatureTermForm />
      </div>
    </div>
  );
}
