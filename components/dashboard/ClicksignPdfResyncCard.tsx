"use client";

import { useCallback, useRef, useState } from "react";
import { Download, ScrollText } from "lucide-react";
import { Button } from "primereact/button";
import { toast } from "sonner";
import {
  getClicksignResyncPdfsUrl,
  type ClicksignPdfResyncLogLine,
  type ClicksignPdfResyncResponse,
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

function logLineClass(nivel: string): string {
  switch (nivel) {
    case "SUCESSO":
      return "text-emerald-400";
    case "AVISO":
      return "text-amber-400";
    case "ERRO":
      return "text-rose-400";
    default:
      return "text-white/60";
  }
}

function formatLogLine(line: ClicksignPdfResyncLogLine): string {
  const prefix =
    line.contratoId != null
      ? `[#${line.contratoId}${line.numeroContrato ? ` · ${line.numeroContrato}` : ""}] `
      : "";
  return `${prefix}${line.mensagem}`;
}

export function ClicksignPdfResyncCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClicksignPdfResyncResponse | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const runResync = useCallback(async () => {
    const url = getClicksignResyncPdfsUrl();
    if (!url) {
      toast.error("URL da API não configurada.");
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const res = await apiFetch(url, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro HTTP ${res.status}`);
      }
      const json = (await res.json()) as ClicksignPdfResyncResponse;
      setResult(json);
      if (json.falhas > 0) {
        toast.warning(
          `Resincronização concluída com ${json.falhas} falha(s). Verifique os logs.`,
        );
      } else if (json.baixados > 0) {
        toast.success(`${json.baixados} PDF(s) gravado(s) com sucesso.`);
      } else {
        toast.info("Nenhum contrato elegível ou nenhum PDF baixado.");
      }
      requestAnimationFrame(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha na resincronização.";
      toast.error(msg);
      setResult({
        totalContratos: 0,
        baixados: 0,
        ignorados: 0,
        falhas: 1,
        diretorioUpload: "",
        logs: [{ nivel: "ERRO", mensagem: msg, contratoId: null, numeroContrato: null }],
      });
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-400/10 shrink-0">
            <Download size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-white">PDFs assinados no servidor</h2>
            <p className="text-xs text-white/40 leading-relaxed max-w-2xl">
              Lê os contratos <span className="text-white/70">ASSINADO</span> com origem{" "}
              <span className="text-white/70">Clicksign</span>, obtém o PDF na API e grava em{" "}
              <code className="text-[10px] text-emerald-400/90">contratos/assinados/</code>.
            </p>
          </div>
        </div>
        <Button
          type="button"
          label={running ? "Sincronizando…" : "Baixar PDFs assinados"}
          icon={running ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
          disabled={running}
          onClick={runResync}
          className="bg-emerald-600 border-none text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3 rounded-full hover:bg-emerald-500 shrink-0"
          pt={{
            root: { className: "gap-2" },
          }}
        />
      </div>

      {(running || result) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
            <ScrollText size={14} />
            Log da API
          </div>

          {result && !running && (
            <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest">
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/50">
                Total: {result.totalContratos}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                Baixados: {result.baixados}
              </span>
              {result.falhas > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400">
                  Falhas: {result.falhas}
                </span>
              )}
              {result.diretorioUpload && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 font-mono normal-case tracking-normal text-[9px]">
                  {result.diretorioUpload}
                </span>
              )}
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-[11px] leading-relaxed",
              "max-h-[min(420px,50vh)] overflow-y-auto",
            )}
            role="log"
            aria-live="polite"
            aria-busy={running}
          >
            {running && (
              <p className="text-white/40 animate-pulse">Aguardando resposta da API…</p>
            )}
            {result?.logs.map((line, index) => (
              <div
                key={`${line.nivel}-${index}-${line.contratoId ?? "g"}`}
                className={cn("py-0.5", logLineClass(line.nivel))}
              >
                <span className="text-white/20 mr-2 select-none">{line.nivel}</span>
                {formatLogLine(line)}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
