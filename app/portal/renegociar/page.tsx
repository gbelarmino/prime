"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { portalFetch } from "@/lib/portal-fetch";
import { getApiBaseUrl } from "@/lib/api-config";
import { portalListarContratos, type PortalContrato } from "@/lib/portal-service";
import { formatIsoDate } from "@/lib/fin-vencimento";
import {
  PortalAlert,
  PortalField,
  PortalPageHeader,
  PortalStepIndicator,
  formatPortalDate,
  formatPortalMoney,
} from "@/lib/portal-ui";

const MODOS = [
  { label: "Um boleto único", value: "BOLETO_UNICO" },
  { label: "Dividir em parcelas", value: "PARCELADO" },
];

export default function PortalRenegociarPage() {
  const [contratos, setContratos] = useState<PortalContrato[]>([]);
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [modo, setModo] = useState("BOLETO_UNICO");
  const [valorTotal, setValorTotal] = useState<number | null>(null);
  const [qtdParcelas, setQtdParcelas] = useState(3);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [preview, setPreview] = useState<{ ordem: number; valor: number; vencimento: string }[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [passo, setPasso] = useState(1);

  useEffect(() => {
    portalListarContratos().then(setContratos).catch(() => {});
  }, []);

  async function simular() {
    if (!contratoId || valorTotal == null || !vencimento) {
      setErro("Preencha contrato, valor total e primeiro vencimento.");
      return;
    }
    setErro(null);
    const body = {
      contratoId,
      modo,
      valorTotal,
      quantidadeParcelas: modo === "PARCELADO" ? qtdParcelas : null,
      primeiroVencimento: formatIsoDate(vencimento),
      titulosOrigemIds: [],
    };
    const res = await portalFetch(`${getApiBaseUrl()}/api/portal/renegociacao/simular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setErro("Não foi possível simular o plano. Verifique os dados.");
      return;
    }
    const data = await res.json();
    setPreview(data.parcelas ?? []);
    setPasso(2);
  }

  async function confirmar() {
    if (!contratoId || valorTotal == null || !vencimento) return;
    setErro(null);
    const body = {
      contratoId,
      modo,
      valorTotal,
      quantidadeParcelas: modo === "PARCELADO" ? qtdParcelas : null,
      primeiroVencimento: formatIsoDate(vencimento),
      titulosOrigemIds: [],
    };
    const res = await portalFetch(`${getApiBaseUrl()}/api/portal/renegociacao/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setErro("Não foi possível confirmar. Tente novamente.");
      return;
    }
    setMensagem("Plano confirmado. As novas parcelas já estão em Parcelas.");
    setPasso(3);
    setPreview([]);
  }

  return (
    <>
      <PortalPageHeader
        title="Renegociar"
        description="Monte um novo plano para títulos vencidos. Simule antes de confirmar."
      />

      <PortalStepIndicator step={passo} total={3} />

      {erro ? <PortalAlert tone="error">{erro}</PortalAlert> : null}
      {mensagem ? <PortalAlert tone="success">{mensagem}</PortalAlert> : null}

      {passo < 3 && (
        <div className="rounded-[var(--portal-radius-lg)] border border-[var(--portal-border)] bg-[var(--portal-surface)] p-5 space-y-5 portal-animate-in">
          <PortalField label="Contrato">
            <Dropdown
              value={contratoId}
              options={contratos.map((c) => ({
                label: c.numeroContrato || `Contrato ${c.id}`,
                value: c.id,
              }))}
              onChange={(e) => setContratoId(e.value)}
              placeholder="Selecione o contrato"
              className="w-full"
            />
          </PortalField>

          <PortalField label="Forma de pagamento">
            <Dropdown value={modo} options={MODOS} onChange={(e) => setModo(e.value)} className="w-full" />
          </PortalField>

          <PortalField label="Valor total da renegociação">
            <InputNumber
              value={valorTotal}
              onValueChange={(e) => setValorTotal(e.value ?? null)}
              mode="currency"
              currency="BRL"
              locale="pt-BR"
              className="w-full"
            />
          </PortalField>

          {modo === "PARCELADO" && (
            <PortalField label="Número de parcelas" hint="Máximo conforme política da imobiliária">
              <InputNumber
                value={qtdParcelas}
                onValueChange={(e) => setQtdParcelas(e.value ?? 3)}
                min={1}
                max={12}
                className="w-full"
              />
            </PortalField>
          )}

          <PortalField label="Vencimento da 1ª parcela">
            <Calendar
              value={vencimento}
              onChange={(e) => setVencimento(e.value as Date | null)}
              dateFormat="dd/mm/yy"
              className="w-full"
              minDate={new Date()}
            />
          </PortalField>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button label="Simular plano" className="portal-btn-ghost flex-1" icon="pi pi-calculator" onClick={simular} />
            {preview.length > 0 && (
              <Button label="Confirmar" className="portal-btn-primary flex-1" icon="pi pi-check" onClick={confirmar} />
            )}
          </div>
        </div>
      )}

      {preview.length > 0 && passo === 2 && (
        <section className="mt-6 portal-animate-in">
          <h3 className="text-sm font-semibold text-[var(--portal-text)] mb-3">Prévia do plano</h3>
          <ol className="space-y-2">
            {preview.map((p) => (
              <li
                key={p.ordem}
                className="flex justify-between items-center rounded-[var(--portal-radius)] border border-[var(--portal-border)] bg-[var(--portal-bg-elevated)] px-4 py-3 text-sm"
              >
                <span className="text-[var(--portal-text-muted)]">{p.ordem}ª parcela</span>
                <span className="font-medium text-[var(--portal-text)]">{formatPortalMoney(p.valor)}</span>
                <span className="text-[var(--portal-text-faint)]">{formatPortalDate(p.vencimento)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {passo === 3 && (
        <div className="mt-4">
          <Button
            label="Ver minhas parcelas"
            className="portal-btn-primary w-full"
            icon="pi pi-arrow-right"
            iconPos="right"
            onClick={() => (window.location.href = "/portal/parcelas")}
          />
        </div>
      )}
    </>
  );
}
