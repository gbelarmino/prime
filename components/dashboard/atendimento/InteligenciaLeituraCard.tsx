"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { getTenantId } from "@/lib/auth-storage";
import {
  decidirInteligencia,
  isInteligenciaLeituraEvent,
  obterInteligenciaLeitura,
  type InteligenciaLeitura,
} from "@/lib/inteligencia-leitura";
import { subscribeRealtime } from "@/lib/realtime-socket";

const TENDENCIA: Record<string, string> = {
  MELHORA: "Tendência de melhora",
  DETERIORACAO: "Tendência de piora",
  ESTABILIDADE: "Tendência estável",
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function InteligenciaLeituraCard({
  contratoId,
  onCasoAguardando,
}: {
  contratoId: number;
  onCasoAguardando: (casoId: string | null) => void;
}) {
  const [leitura, setLeitura] = useState<InteligenciaLeitura | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const dados = await obterInteligenciaLeitura(contratoId);
      setLeitura(dados);
      setErro(null);
      const caso = dados.caso;
      const aguarda =
        caso != null &&
        caso.acao == null &&
        (caso.decisao === "ACEITAR" || caso.decisao === "AJUSTAR");
      onCasoAguardando(aguarda ? caso.id : null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar a leitura.");
    }
  }, [contratoId, onCasoAguardando]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const tenantId = getTenantId();
    return subscribeRealtime((message) => {
      if (!isInteligenciaLeituraEvent(message)) return;
      if (message.contratoId !== contratoId) return;
      if (tenantId != null && message.tenantId !== tenantId) return;
      void carregar();
    });
  }, [carregar, contratoId]);

  const decidir = async (decisao: string, codigoOpcao?: string) => {
    setEnviando(true);
    try {
      const dados = await decidirInteligencia(contratoId, {
        decisao,
        codigoOpcao,
        ajuste: ajuste.trim() || undefined,
        motivo: motivo.trim() || undefined,
      });
      setLeitura(dados);
      setMotivo("");
      setAjuste("");
      const caso = dados.caso;
      const aguarda =
        caso != null &&
        caso.acao == null &&
        (caso.decisao === "ACEITAR" || caso.decisao === "AJUSTAR");
      onCasoAguardando(aguarda ? caso.id : null);
      toast.success("Decisão registrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar a decisão.");
    } finally {
      setEnviando(false);
    }
  };

  if (erro) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
        {erro}
      </section>
    );
  }
  if (!leitura) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        Montando a leitura do contrato…
      </section>
    );
  }

  const corpo = leitura.leitura;
  const caso = leitura.caso;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-300">
        Leitura do contrato
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">
          {corpo.cobertura === "BAIXA" ? "Cobertura baixa" : "Cobertura suficiente"}
        </span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">
          {TENDENCIA[corpo.tendencia] ?? corpo.tendencia}
        </span>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-100">
          Risco incerto
        </span>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-white/80">{corpo.texto}</p>
      <p className="mt-3 text-xs text-white/45">
        Vencido em aberto {moeda(corpo.vencidoEmAberto)} · Saldo {moeda(corpo.saldo)} · Propensão não
        estimada nos horizontes de {corpo.horizontePermanencia} e {corpo.horizonteAcordo}
        {corpo.outrosContratos > 0
          ? ` · ${corpo.outrosContratos} outro(s) contrato(s) deste contratante no tenant`
          : ""}
      </p>
      {corpo.caracteristicas.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {corpo.caracteristicas.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/75"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 space-y-1 text-xs text-white/40">
        {corpo.limites.map((limite) => (
          <li key={limite}>{limite}</li>
        ))}
      </ul>

      {caso ? (
        <p className="mt-4 text-sm text-white/75">
          Decisão {caso.decisao.toLowerCase()}
          {caso.codigoOpcao ? ` · ${caso.codigoOpcao}` : ""}
          {caso.acao ? ` · ação ${caso.acao.toLowerCase()}` : " · ação ainda não vinculada"}
          {caso.divergente ? " · a ação divergiu da opção" : ""}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3">
            {corpo.opcoes.map((opcao) => (
              <article key={opcao.codigo} className="rounded-xl border border-white/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{opcao.rotulo}</h3>
                    <p className="mt-1 text-xs text-white/60">{opcao.intencao}</p>
                    <p className="mt-1 text-xs text-white/40">{opcao.evidencia}</p>
                    <p className="mt-1 text-xs text-white/40">Checar: {opcao.checar}</p>
                  </div>
                  <Button
                    type="button"
                    disabled={enviando}
                    onClick={() =>
                      void decidir(ajuste.trim() ? "AJUSTAR" : "ACEITAR", opcao.codigo)
                    }
                    className="border-none bg-blue-600 text-sm hover:bg-blue-500"
                  >
                    {ajuste.trim() ? "Aceitar com ajuste" : "Aceitar"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <InputTextarea
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            rows={2}
            autoResize
            placeholder="Ajuste, se a opção aceita precisar de ressalva"
            className="w-full"
          />
          <InputTextarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            autoResize
            placeholder="Motivo da decisão"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={enviando}
              onClick={() => void decidir("ADIAR")}
              className="border border-white/15 bg-transparent text-white"
            >
              Adiar
            </Button>
            <Button
              type="button"
              disabled={enviando}
              onClick={() => void decidir("RECUSAR")}
              className="border border-white/15 bg-transparent text-white"
            >
              Recusar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
