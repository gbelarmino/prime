"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { setPortalSession, isPortalAuthenticated } from "@/lib/portal-auth-storage";
import { portalSolicitarOtp, portalVerificarOtp } from "@/lib/portal-service";
import { PortalAlert, PortalField, PortalStepIndicator } from "@/lib/portal-ui";

export function PortalLoginForm() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"cpf" | "otp">("cpf");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jaLogado, setJaLogado] = useState(false);

  useEffect(() => {
    setJaLogado(isPortalAuthenticated());
  }, []);

  if (jaLogado) {
    return (
      <div className="flex flex-col gap-4">
        <PortalAlert tone="info">Você já está conectado neste dispositivo.</PortalAlert>
        <Button
          label="Ir para minha área"
          className="portal-btn-primary w-full"
          onClick={() => router.push("/portal/parcelas")}
        />
      </div>
    );
  }

  async function enviarCpf() {
    setErro(null);
    setLoading(true);
    try {
      const res = await portalSolicitarOtp(cpf);
      setMensagem(res.mensagem);
      setDevOtp(res.devOtpExposto ? res.devOtp ?? null : null);
      setEtapa("otp");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao solicitar código");
    } finally {
      setLoading(false);
    }
  }

  async function verificar() {
    setErro(null);
    setLoading(true);
    try {
      const res = await portalVerificarOtp(cpf, codigo);
      setPortalSession(res.token, res.contratanteId, res.nome);
      router.replace("/portal/parcelas");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  }

  const step = etapa === "cpf" ? 1 : 2;

  return (
    <div className="flex flex-col gap-5">
      <PortalStepIndicator step={step} total={2} />

      {erro ? <PortalAlert tone="error">{erro}</PortalAlert> : null}

      {etapa === "cpf" ? (
        <>
          <PortalField label="CPF" htmlFor="portal-cpf" hint="O mesmo cadastrado na compra do lote">
            <InputText
              id="portal-cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full"
              inputMode="numeric"
            />
          </PortalField>
          <Button
            label="Enviar código no celular"
            loading={loading}
            onClick={enviarCpf}
            className="portal-btn-primary w-full"
            icon="pi pi-mobile"
            iconPos="left"
          />
        </>
      ) : (
        <>
          {mensagem ? <PortalAlert tone="info">{mensagem}</PortalAlert> : null}
          {(devOtp || process.env.NODE_ENV === "development") && (
            <PortalAlert tone="warn">
              {devOtp
                ? `Desenvolvimento: use ${devOtp} ou 9999`
                : "Desenvolvimento: use o código 9999"}
            </PortalAlert>
          )}
          <PortalField label="Código de verificação" htmlFor="portal-otp" hint="6 dígitos enviados por SMS/WhatsApp">
            <InputText
              id="portal-otp"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={process.env.NODE_ENV === "development" ? "9999" : "••••••"}
              className="w-full text-center text-xl tracking-[0.4em] font-mono"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </PortalField>
          <Button
            label="Acessar portal"
            loading={loading}
            onClick={verificar}
            className="portal-btn-primary w-full"
            icon="pi pi-arrow-right"
            iconPos="right"
          />
          <button
            type="button"
            className="text-sm text-[var(--portal-text-faint)] hover:text-[var(--portal-text)] text-left"
            onClick={() => {
              setEtapa("cpf");
              setCodigo("");
              setMensagem(null);
              setDevOtp(null);
              setErro(null);
            }}
          >
            ← Usar outro CPF
          </button>
        </>
      )}

      <p className="text-center text-sm text-[var(--portal-text-faint)] pt-2 border-t border-[var(--portal-border)]">
        Primeira vez aqui?{" "}
        <Link href="/portal/cadastrar" className="text-[var(--portal-accent)] font-medium hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
