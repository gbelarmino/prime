"use client";

import { useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getClicksignAutoSignatureTermUrl,
  type AutoSignatureTermResponse,
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCpfInput(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function ClicksignAutoSignatureTermForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AutoSignatureTermResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = getClicksignAutoSignatureTermUrl();
    if (!url) {
      toast.error("URL da API não configurada.");
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits.length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.");
      return;
    }
    if (!dataNascimento) {
      toast.error("Informe a data de nascimento.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          cpf: cpfDigits,
          dataNascimento,
        }),
      });
      const json = (await res.json()) as AutoSignatureTermResponse;
      setResult(json);
      if (json.success) {
        toast.success(json.message || "Termo criado com sucesso.");
      } else {
        toast.error(json.message || "A Clicksign rejeitou a requisição.");
      }
    } catch {
      toast.error("Falha ao enviar os dados. Verifique a conexão com a API.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/10 bg-white/5 p-6 md:p-8 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Nome
            </span>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Nome completo do signatário"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="email@exemplo.com"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              CPF
            </span>
            <input
              type="text"
              required
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(formatCpfInput(e.target.value))}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="000.000.000-00"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Data de nascimento
            </span>
            <input
              type="date"
              required
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-500 disabled:opacity-50",
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4" />
            )}
            Enviar para Clicksign
          </button>
        </div>
      </form>

      {result && (
        <div
          className={cn(
            "rounded-[2rem] border p-6 md:p-8 flex flex-col gap-4",
            result.success
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10",
          )}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-lg font-semibold text-white font-[family-name:var(--font-playfair)]">
              {result.success ? "Termo criado" : "Resposta da API"}
            </h3>
            <span className="text-xs font-mono text-white/60">HTTP {result.statusCode}</span>
          </div>
          <p className="text-sm text-white/80">{result.message}</p>
          {result.success && result.termoId && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-white/40 text-xs uppercase tracking-wider">ID do termo</dt>
                <dd className="text-white font-mono break-all">{result.termoId}</dd>
              </div>
              {result.nome && (
                <div>
                  <dt className="text-white/40 text-xs uppercase tracking-wider">Nome</dt>
                  <dd className="text-white">{result.nome}</dd>
                </div>
              )}
              {result.email && (
                <div>
                  <dt className="text-white/40 text-xs uppercase tracking-wider">E-mail</dt>
                  <dd className="text-white">{result.email}</dd>
                </div>
              )}
              {result.documentation && (
                <div>
                  <dt className="text-white/40 text-xs uppercase tracking-wider">CPF</dt>
                  <dd className="text-white">{result.documentation}</dd>
                </div>
              )}
              {result.birthday && (
                <div>
                  <dt className="text-white/40 text-xs uppercase tracking-wider">Nascimento</dt>
                  <dd className="text-white">{result.birthday}</dd>
                </div>
              )}
              {result.created && (
                <div>
                  <dt className="text-white/40 text-xs uppercase tracking-wider">Criado em</dt>
                  <dd className="text-white">{result.created}</dd>
                </div>
              )}
            </dl>
          )}
          {!result.success && result.errors && result.errors.length > 0 && (
            <ul className="list-disc list-inside text-sm text-amber-100/90 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {result.raw && (
            <details className="text-sm">
              <summary className="cursor-pointer text-white/50 hover:text-white/80">
                Ver resposta completa (JSON)
              </summary>
              <pre className="mt-3 overflow-auto rounded-xl bg-black/40 p-4 text-xs text-white/70 max-h-80">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
