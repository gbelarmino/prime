"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { getWhatsAppTwilioSaldoUrl } from "@/lib/api-config";
import { getTenantId } from "@/lib/auth-storage";
import { subscribeRealtime } from "@/lib/realtime-socket";
import { subscribeTwilioSaldoRefresh } from "@/lib/twilio-saldo-events";

type TwilioSaldo = {
  balance: string | null;
  currency: string | null;
  accountSid: string | null;
  configurado: boolean;
};

function formatSaldo(balance: string | null, currency: string | null): string {
  if (balance == null || balance === "") return "—";
  const n = Number(balance);
  const cur = (currency || "USD").toUpperCase();
  if (Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(n);
    } catch {
      return `${n.toFixed(3)} ${cur}`;
    }
  }
  return `${balance} ${cur}`;
}

/**
 * Saldo da conta Twilio do tenant — entre o seletor de tenant e o ícone de mensagens.
 * Atualiza no mount, ao trocar tenant, após envio (evento) e em MSG_ENVIADA (realtime).
 */
export function TwilioSaldoHeader() {
  const [saldo, setSaldo] = useState<TwilioSaldo | null>(null);
  const [erro, setErro] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);
  const tenantRef = useRef<number | null>(getTenantId());

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(getWhatsAppTwilioSaldoUrl(), { skipLoading: true });
      if (!res.ok) {
        setErro(true);
        setSaldo(null);
        return;
      }
      const data = (await res.json()) as TwilioSaldo;
      setSaldo(data);
      setErro(false);
    } catch {
      setErro(true);
      setSaldo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDebounced = useCallback(() => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void refresh();
    }, 800);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeTwilioSaldoRefresh(() => refreshDebounced());
  }, [refreshDebounced]);

  useEffect(() => {
    return subscribeRealtime((msg) => {
      const type = typeof msg.type === "string" ? msg.type : "";
      if (type === "MSG_ENVIADA") {
        refreshDebounced();
      }
    });
  }, [refreshDebounced]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = getTenantId();
      if (t !== tenantRef.current) {
        tenantRef.current = t;
        setLoading(true);
        void refresh();
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const label = loading
    ? "Saldo…"
    : erro
      ? "Saldo indisponível"
      : !saldo?.configurado
        ? "Twilio n/c"
        : formatSaldo(saldo.balance, saldo.currency);

  const title = loading
    ? "Consultando saldo Twilio…"
    : erro
      ? "Não foi possível obter o saldo Twilio"
      : !saldo?.configurado
        ? "Twilio não configurado neste tenant"
        : `Saldo Twilio: ${formatSaldo(saldo.balance, saldo.currency)}`;

  const tone =
    erro || !saldo?.configurado
      ? "text-white/35"
      : Number(saldo.balance) < 5
        ? "text-amber-300"
        : "text-emerald-300/90";

  return (
    <div
      className={`mr-1 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium tabular-nums ${tone}`}
      title={title}
      aria-label={title}
    >
      <Wallet size={14} className="opacity-70" strokeWidth={2} />
      <span className="max-w-[7.5rem] truncate">{label}</span>
    </div>
  );
}
