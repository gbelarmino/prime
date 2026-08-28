type PortalOtpEnvioMensagemProps = {
  mensagem: string;
  destinoMascarado?: string | null;
  className?: string;
};

/** Destaca em negrito o e-mail/telefone mascarado dentro da mensagem da API. */
export function PortalOtpEnvioMensagem({
  mensagem,
  destinoMascarado,
  className,
}: PortalOtpEnvioMensagemProps) {
  if (!destinoMascarado || !mensagem.includes(destinoMascarado)) {
    return <span className={className}>{mensagem}</span>;
  }

  const [before, after] = mensagem.split(destinoMascarado);
  return (
    <span className={className}>
      {before}
      <strong className="font-semibold text-[var(--portal-text)]">{destinoMascarado}</strong>
      {after}
    </span>
  );
}
