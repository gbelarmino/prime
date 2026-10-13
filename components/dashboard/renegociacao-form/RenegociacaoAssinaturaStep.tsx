"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Download, Send } from "lucide-react";
import { toast } from "sonner";
import { getTenantId } from "@/lib/auth-storage";
import { isRenegociacaoAssinaturaEvent } from "@/lib/renegociacao-assinatura-realtime";
import {
  enviarAditivoClicksign,
  obterAssinaturaRenegociacao,
} from "@/lib/renegociacao-service";
import type { AssinaturaRenegociacao } from "@/lib/renegociacao-types";
import { subscribeRealtime } from "@/lib/realtime-socket";

const SIGNATARIOS = [
  "Promitente compradora — e-mail do contrato",
  "Joana Rita Neto Santos Aires — vendedora, assinatura automática",
  "Henrique Neto Alexandre — testemunha, assinatura automática",
  "Francisca Sandila Felipe de Barros — testemunha, e-mail",
];

const EVENTO_LABEL: Record<string, string> = {
  envelope_running: "Enviado para assinatura",
  signature_started: "Assinatura iniciada",
  sign: "Assinou",
  document_closed: "Documento fechado",
  close: "Documento fechado",
  auto_close: "Documento fechado",
};

type Props = {
  contratoId: number;
  renegociacaoId: number;
  modalidadeT1: boolean;
  somenteLeitura: boolean;
  baixandoAditivo: boolean;
  onBaixarAditivo?: () => void;
  onDocumentoPronto: (pronto: boolean) => void;
};

function rotuloEvento(evento: string): string {
  return EVENTO_LABEL[evento] ?? evento;
}

function formatarQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function RenegociacaoAssinaturaStep({
  contratoId,
  renegociacaoId,
  modalidadeT1,
  somenteLeitura,
  baixandoAditivo,
  onBaixarAditivo,
  onDocumentoPronto,
}: Props) {
  const [assinatura, setAssinatura] = useState<AssinaturaRenegociacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const onDocumentoProntoRef = useRef(onDocumentoPronto);
  onDocumentoProntoRef.current = onDocumentoPronto;

  const carregar = useCallback(async () => {
    if (!modalidadeT1) return;
    setCarregando(true);
    try {
      const dados = await obterAssinaturaRenegociacao(contratoId, renegociacaoId);
      setAssinatura(dados);
      const pronto =
        dados.statusDocumento === "ASSINADO" || dados.statusDocumento === "ENVIADO";
      onDocumentoProntoRef.current(pronto);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível consultar a assinatura.");
    } finally {
      setCarregando(false);
    }
  }, [contratoId, modalidadeT1, renegociacaoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const tenantId = getTenantId();
    return subscribeRealtime((data) => {
      if (!isRenegociacaoAssinaturaEvent(data)) return;
      if (data.renegociacaoId !== renegociacaoId) return;
      if (tenantId != null && data.tenantId !== tenantId) return;
      void carregar();
    });
  }, [carregar, renegociacaoId]);

  const enviar = async () => {
    setEnviando(true);
    try {
      const dados = await enviarAditivoClicksign(contratoId, renegociacaoId);
      setAssinatura(dados);
      toast.success("Aditivo enviado para assinatura na Clicksign.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar para a Clicksign.");
    } finally {
      setEnviando(false);
    }
  };

  if (!modalidadeT1) {
    return (
      <p className="text-sm text-white/60">
        Nesta modalidade a assinatura continua pelo arquivo enviado no passo de documentos.
      </p>
    );
  }

  const fechado = assinatura?.statusDocumento === "ASSINADO" && assinatura.provedorAssinatura === "CLICKSIGN";
  const enviado = assinatura?.enviadoClicksign === true && !fechado;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-white/60">
        O termo segue o modelo do aditivo: vendedora, compradora e duas testemunhas. O PDF assinado
        volta para o processo quando a Clicksign fechar o documento. O envio manual do PDF no passo
        anterior também libera a efetivação.
      </p>
      <ul className="space-y-1 text-sm text-white/80">
        {SIGNATARIOS.map((nome) => (
          <li key={nome}>{nome}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        {onBaixarAditivo ? (
          <Button
            type="button"
            label="Baixar minuta"
            icon={<Download className="mr-2 h-4 w-4" />}
            loading={baixandoAditivo}
            disabled={enviando}
            onClick={onBaixarAditivo}
            severity="secondary"
            className="rounded-full border-white/10 bg-white/5 text-white"
          />
        ) : null}
        {!somenteLeitura && !enviado && !fechado ? (
          <Button
            type="button"
            label="Enviar para Clicksign"
            icon={<Send className="mr-2 h-4 w-4" />}
            loading={enviando || carregando}
            onClick={() => void enviar()}
            className="rounded-full border-0 bg-violet-600 px-6 font-black uppercase tracking-widest"
          />
        ) : null}
      </div>
      {enviado ? (
        <p className="text-sm text-amber-100/90">Aguardando as assinaturas na Clicksign.</p>
      ) : null}
      {fechado ? (
        <p className="text-sm text-emerald-300/90">Aditivo assinado. O PDF foi gravado no processo.</p>
      ) : null}
      {assinatura && assinatura.eventos.length > 0 ? (
        <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
          {assinatura.eventos.map((evento) => (
            <li key={evento.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
              <span className="text-white">{rotuloEvento(evento.evento)}</span>
              <span className="text-xs text-white/45">
                {[evento.signatario, formatarQuando(evento.recebidoEm)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
