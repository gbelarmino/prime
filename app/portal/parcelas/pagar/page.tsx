"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { toast } from "sonner";
import { getPortalToken } from "@/lib/portal-auth-storage";
import {
  portalListarParcelas,
  portalPagamento,
  portalPdfBoletoUrl,
  type PortalPagamento,
  type PortalParcela,
} from "@/lib/portal-service";
import {
  PortalAlert,
  PortalBadge,
  PortalPageHeader,
  PortalSkeleton,
  formatPortalMoney,
  isPortalParcelaPaga,
  portalStatusLabel,
  portalVencimentoTexto,
} from "@/lib/portal-ui";
import { cn } from "@/lib/utils";

type Aba = "pix" | "boleto" | "pdf";

function PortalParcelaPagarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";

  const [parcela, setParcela] = useState<PortalParcela | null>(null);
  const [pagamento, setPagamento] = useState<PortalPagamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>("pix");

  useEffect(() => {
    if (!id) {
      router.replace("/portal/parcelas");
      return;
    }

    setLoading(true);
    setErro(null);
    portalListarParcelas()
      .then((lista) => {
        const item = lista.find((x) => x.id === id) ?? null;
        setParcela(item);
        if (!item) {
          setErro("Parcela não encontrada.");
          return;
        }
        if (isPortalParcelaPaga(item.status)) {
          return;
        }
        return portalPagamento(id).then((p) => {
          setPagamento(p);
          if (p.pixCopiaCola) setAba("pix");
          else if (p.linhaDigitavel || p.urlBoleto) setAba("boleto");
          else if (p.pdfDisponivel) setAba("pdf");
        });
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const paga = parcela ? isPortalParcelaPaga(parcela.status) : false;

  async function copiar(texto: string | null, label: string) {
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado`);
  }

  function abrirPdf() {
    const token = getPortalToken();
    fetch(portalPdfBoletoUrl(id), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      })
      .catch(() => setErro("Não foi possível abrir o PDF"));
  }

  const abas: { id: Aba; label: string; icon: string; show: boolean }[] = [
    { id: "pix", label: "PIX", icon: "pi-qrcode", show: Boolean(pagamento?.pixCopiaCola) },
    {
      id: "boleto",
      label: "Boleto",
      icon: "pi-barcode",
      show: Boolean(pagamento?.linhaDigitavel || pagamento?.urlBoleto),
    },
    { id: "pdf", label: "PDF", icon: "pi-file-pdf", show: Boolean(pagamento?.pdfDisponivel) },
  ];

  if (!id) {
    return <PortalSkeleton className="h-48 w-full" />;
  }

  return (
    <>
      <PortalPageHeader
        title={paga ? "Parcela quitada" : "Pagar parcela"}
        description={
          paga
            ? "Esta parcela já foi paga. Não há formas de pagamento disponíveis."
            : "Escolha a forma mais conveniente. Os dados são os mesmos do banco emissor."
        }
        backHref="/portal/parcelas"
        backLabel="Parcelas"
      />

      {loading ? (
        <PortalSkeleton className="h-48 w-full" />
      ) : erro ? (
        <PortalAlert tone="error">{erro}</PortalAlert>
      ) : paga && parcela ? (
        <div className="space-y-5 portal-animate-in">
          <div className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-success)]/30 bg-[var(--portal-success-bg)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--portal-text-faint)]">
                  {parcela.numeroContrato} · {parcela.numeroParcela}ª parcela
                </p>
                <p className="mt-2 font-[family-name:var(--font-portal-display)] text-3xl font-semibold text-[var(--portal-text)]">
                  {formatPortalMoney(parcela.valorNominal)}
                </p>
                <p className="mt-1 text-sm text-[var(--portal-text-muted)]">
                  {portalVencimentoTexto(parcela.vencimento)}
                </p>
              </div>
              <PortalBadge tone={portalStatusLabel(parcela.status, parcela.vencido).tone}>
                {portalStatusLabel(parcela.status, parcela.vencido).label}
              </PortalBadge>
            </div>
          </div>
          <PortalAlert tone="success">Pagamento confirmado. Obrigado!</PortalAlert>
        </div>
      ) : pagamento ? (
        <div className="space-y-5 portal-animate-in">
          <div className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-accent)]/30 bg-gradient-to-br from-[var(--portal-accent-glow)] to-transparent p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--portal-text-faint)]">
                  {parcela
                    ? `${parcela.numeroContrato} · ${parcela.numeroParcela}ª parcela`
                    : "Parcela"}
                </p>
                <p className="mt-2 font-[family-name:var(--font-portal-display)] text-3xl font-semibold text-[var(--portal-accent)]">
                  {parcela ? formatPortalMoney(parcela.valorNominal) : "—"}
                </p>
                {parcela ? (
                  <p className="mt-1 text-sm text-[var(--portal-text-muted)]">
                    {portalVencimentoTexto(parcela.vencimento)}
                  </p>
                ) : null}
              </div>
              {parcela ? (
                <PortalBadge tone={portalStatusLabel(parcela.status, parcela.vencido).tone}>
                  {portalStatusLabel(parcela.status, parcela.vencido).label}
                </PortalBadge>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 border-b border-[var(--portal-border)] pb-px" role="tablist">
            {abas
              .filter((a) => a.show)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    aba === a.id
                      ? "border-[var(--portal-accent)] text-[var(--portal-accent)]"
                      : "border-transparent text-[var(--portal-text-faint)] hover:text-[var(--portal-text)]"
                  }`}
                >
                  <i className={cn("pi", a.icon)} aria-hidden />
                  {a.label}
                </button>
              ))}
          </div>

          {aba === "pix" && pagamento.pixCopiaCola && (
            <section className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-5 space-y-4">
              <p className="text-sm text-[var(--portal-text-muted)]">
                Cole no app do seu banco em PIX → Copia e cola.
              </p>
              <InputText value={pagamento.pixCopiaCola} readOnly className="w-full text-xs font-mono" />
              <Button
                label="Copiar código PIX"
                className="portal-btn-primary w-full"
                icon="pi pi-copy"
                onClick={() => copiar(pagamento.pixCopiaCola, "PIX")}
              />
            </section>
          )}

          {aba === "boleto" && (
            <section className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-5 space-y-4">
              {pagamento.linhaDigitavel && (
                <>
                  <p className="text-sm font-medium text-[var(--portal-text)]">Linha digitável</p>
                  <InputText value={pagamento.linhaDigitavel} readOnly className="w-full text-xs font-mono" />
                  <Button
                    label="Copiar linha"
                    className="portal-btn-ghost w-full"
                    icon="pi pi-copy"
                    onClick={() => copiar(pagamento.linhaDigitavel, "Linha digitável")}
                  />
                </>
              )}
              {pagamento.urlBoleto && (
                <a
                  href={pagamento.urlBoleto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-[var(--portal-radius)] border border-[var(--portal-border)] py-3 text-sm font-medium text-[var(--portal-accent)] hover:bg-white/5"
                >
                  <i className="pi pi-external-link" aria-hidden />
                  Abrir no site do banco
                </a>
              )}
            </section>
          )}

          {aba === "pdf" && pagamento.pdfDisponivel && (
            <section className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-5">
              <p className="text-sm text-[var(--portal-text-muted)] mb-4">
                Baixe o boleto em PDF para pagar em lotérica ou agência.
              </p>
              <Button
                label="Baixar PDF do boleto"
                className="portal-btn-primary w-full"
                icon="pi pi-download"
                iconPos="right"
                onClick={abrirPdf}
              />
            </section>
          )}
        </div>
      ) : null}
    </>
  );
}

export default function PortalParcelaPagarPage() {
  return (
    <Suspense fallback={<PortalSkeleton className="h-48 w-full" />}>
      <PortalParcelaPagarContent />
    </Suspense>
  );
}
