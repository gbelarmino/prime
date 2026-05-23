"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { portalCadastrar } from "@/lib/portal-service";
import { PortalAlert, PortalField, PortalStepIndicator } from "@/lib/portal-ui";

export default function PortalCadastrarPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setLoading(true);
    try {
      const res = await portalCadastrar({ nome, cpf, email, telefone });
      setSucesso(res.mensagem);
      setTimeout(() => router.push("/portal"), 2200);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível concluir o cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalAuthShell
      badge="Novo comprador"
      title="Crie sua conta"
      subtitle="Leva menos de um minuto. Depois você entra com CPF e código no celular."
    >
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <PortalStepIndicator step={1} total={1} />

        {erro ? <PortalAlert tone="error">{erro}</PortalAlert> : null}
        {sucesso ? <PortalAlert tone="success">{sucesso}</PortalAlert> : null}

        <PortalField label="Nome completo" htmlFor="cad-nome">
          <InputText id="cad-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full" required />
        </PortalField>

        <PortalField label="CPF" htmlFor="cad-cpf">
          <InputText
            id="cad-cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full"
            required
          />
        </PortalField>

        <PortalField label="E-mail" htmlFor="cad-email">
          <InputText
            id="cad-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            required
          />
        </PortalField>

        <PortalField label="Celular (WhatsApp)" htmlFor="cad-tel" hint="Enviaremos o código de acesso por aqui">
          <InputText
            id="cad-tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="w-full"
            required
          />
        </PortalField>

        <Button type="submit" label="Criar conta" loading={loading} className="portal-btn-primary w-full" />

        <p className="text-center text-sm text-[var(--portal-text-faint)] pt-2 border-t border-[var(--portal-border)]">
          Já tem cadastro?{" "}
          <Link href="/portal" className="text-[var(--portal-accent)] font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </PortalAuthShell>
  );
}
