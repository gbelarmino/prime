"use client";

import { useMemo, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { maskPhone } from "@/lib/format-phone";
import { submitCaptacaoPublica } from "@/lib/crm-captacao-public";
import { cn } from "@/lib/utils";

export type CaptacaoFormConfig = {
  tenantSlug: string;
  campanhaSlug?: string;
  empreendimentoDefault?: string;
  titulo?: string;
  subtitulo?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500 transition-colors";
const labelClass = "mb-2 block text-xs font-bold uppercase tracking-widest text-white/50";

export function CrmCaptacaoPublicForm({ config }: { config: CaptacaoFormConfig }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState("+55");
  const [telefone, setTelefone] = useState("");
  const [empreendimento, setEmpreendimento] = useState(config.empreendimentoDefault ?? "");
  const [observacoes, setObservacoes] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nome: string; etapa: string } | null>(null);

  const titulo = config.titulo ?? "Fale com um consultor";
  const subtitulo =
    config.subtitulo ??
    "Preencha o formulário e nossa equipe entrará em contato em breve.";

  const campanhaLabel = useMemo(() => {
    if (!config.campanhaSlug) return null;
    return config.campanhaSlug.replace(/-/g, " ");
  }, [config.campanhaSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!email.trim() && !telefone.trim()) {
      setError("Informe e-mail ou telefone para contato.");
      return;
    }
    if (!lgpd) {
      setError("É necessário aceitar o tratamento de dados (LGPD).");
      return;
    }

    setSending(true);
    try {
      const result = await submitCaptacaoPublica(
        {
          tenantSlug: config.tenantSlug,
          campanhaSlug: config.campanhaSlug,
          nome: nome.trim(),
          email: email.trim() || undefined,
          empreendimentoInteresse: empreendimento.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          consentimentoLgpd: true,
          utmSource: config.utmSource,
          utmMedium: config.utmMedium,
          utmCampaign: config.utmCampaign,
          utmContent: config.utmContent,
          utmTerm: config.utmTerm,
        },
        telefone,
        ddi,
      );
      setSuccess({ nome: result.nome, etapa: result.funilEtapaNome });
      setNome("");
      setEmail("");
      setTelefone("");
      setObservacoes("");
      setLgpd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-10 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-400" aria-hidden />
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-white">
          Obrigado, {success.nome.split(" ")[0]}!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Recebemos seu interesse. Seu cadastro está na etapa{" "}
          <strong className="text-white/80">{success.etapa}</strong> e em breve um consultor
          entrará em contato.
        </p>
        <Button
          type="button"
          label="Enviar outro cadastro"
          className="mt-8 w-full"
          outlined
          onClick={() => setSuccess(null)}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#071C33]/90 p-8 shadow-2xl backdrop-blur-md md:p-10"
    >
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-blue-400/80">
          Interesse no empreendimento
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-white">
          {titulo}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">{subtitulo}</p>
        {campanhaLabel ? (
          <p className="mt-3 text-[10px] uppercase tracking-wider text-white/30">
            Campanha: {campanhaLabel}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="captacao-nome">
            Nome completo <span className="text-rose-400">*</span>
          </label>
          <InputText
            id="captacao-nome"
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            maxLength={150}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="captacao-email">
            E-mail
          </label>
          <InputText
            id="captacao-email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={150}
          />
        </div>

        <div>
          <label className={labelClass}>
            WhatsApp / telefone
          </label>
          <div className="flex gap-2">
            <InputText
              placeholder="+55"
              className={cn(inputClass, "w-20 min-w-[5rem]")}
              value={ddi}
              onChange={(e) => setDdi(e.target.value)}
            />
            <InputText
              placeholder="(00) 00000-0000"
              className={cn(inputClass, "flex-1")}
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="captacao-emp">
            Empreendimento de interesse
          </label>
          <InputText
            id="captacao-emp"
            className={inputClass}
            value={empreendimento}
            onChange={(e) => setEmpreendimento(e.target.value)}
            maxLength={150}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="captacao-msg">
            Mensagem
          </label>
          <InputTextarea
            id="captacao-msg"
            className={cn(inputClass, "min-h-[100px] resize-y")}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Checkbox
            inputId="captacao-lgpd"
            checked={lgpd}
            onChange={(e) => setLgpd(e.checked === true)}
          />
          <label htmlFor="captacao-lgpd" className="cursor-pointer text-xs leading-relaxed text-white/55">
            Autorizo o tratamento dos meus dados para contato comercial, conforme a Lei Geral de
            Proteção de Dados (LGPD). <span className="text-rose-400">*</span>
          </label>
        </div>

        {error ? (
          <p className="text-xs font-medium text-rose-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          label={sending ? "Enviando…" : "Quero ser contactado"}
          className="w-full"
          disabled={sending}
          icon={sending ? <Loader2 className="animate-spin" size={16} /> : undefined}
        />
      </div>
    </form>
  );
}
