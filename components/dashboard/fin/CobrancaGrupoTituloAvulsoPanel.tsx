"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { toast } from "sonner";
import {
  DASHBOARD_FORM_INPUT_CLASS,
  DashboardCalendar,
} from "@/lib/dashboard-calendar";
import { TituloAvulsoMemorialDialog } from "@/components/dashboard/fin/TituloAvulsoMemorialDialog";
import {
  finService,
  type CobrancaGrupo,
  type ConvenioBanco,
} from "@/lib/fin-service";
import { convenioEmpreendimentoDropdownOptions } from "@/lib/convenio-label";
import {
  inicioDoDiaHoje,
  isVencimentoFuturo,
  normalizarDataCalendario,
} from "@/lib/fin-vencimento";

const FORM_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/35";
const FORM_INPUT_CLASS = DASHBOARD_FORM_INPUT_CLASS;
const DROPDOWN_PT = { input: { className: FORM_INPUT_CLASS } };
const BTN_PRIMARY =
  "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40";
const SUBCARD_CLASS = "rounded-xl border border-white/8 bg-black/25 p-4";

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

function rateioProporcional(total: number, pesos: number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  if (!Number.isFinite(total) || total === 0) return pesos.map(() => 0);
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (soma <= 0) {
    const base = roundMoney(total / n);
    const parts = Array.from({ length: n - 1 }, () => base);
    parts.push(roundMoney(total - base * (n - 1)));
    return parts;
  }
  const parts: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < n - 1; i++) {
    const parte = roundMoney((total * pesos[i]) / soma);
    parts.push(parte);
    acumulado += parte;
  }
  parts.push(roundMoney(total - acumulado));
  return parts;
}

function loteLabel(quadra?: string | null, lote?: number | null): string {
  if (!quadra && lote == null) return "—";
  return `Q${quadra ?? "?"} L${lote ?? "?"}`;
}

type Props = {
  grupo: CobrancaGrupo;
  convenios: ConvenioBanco[];
  convenioIdInicial: string | null;
  parcelaInicial: number | null;
};

/**
 * Emissão avulsa consolidada no grupo: mesmo modelo do título avulso
 * (face + juros + multa + calculadora), com rateio do principal entre lotes.
 */
export function CobrancaGrupoTituloAvulsoPanel({
  grupo,
  convenios,
  convenioIdInicial,
  parcelaInicial,
}: Props) {
  const router = useRouter();
  const convenioOptions = useMemo(
    () => convenioEmpreendimentoDropdownOptions(convenios),
    [convenios],
  );

  const [convenioId, setConvenioId] = useState<string | null>(convenioIdInicial);
  const [parcela, setParcela] = useState<number | null>(parcelaInicial);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [valorTotal, setValorTotal] = useState<number | null>(null);
  const [valorJuros, setValorJuros] = useState<number | null>(null);
  const [valorMulta, setValorMulta] = useState<number | null>(null);
  const [rateios, setRateios] = useState<Record<number, number | null>>({});
  const [memorialOpen, setMemorialOpen] = useState(false);
  const [emitindo, setEmitindo] = useState(false);

  const membrosOrdenados = useMemo(
    () => [...grupo.membros].sort((a, b) => a.contratoId - b.contratoId),
    [grupo.membros],
  );

  useEffect(() => {
    setConvenioId(convenioIdInicial);
    setParcela(parcelaInicial);
    setVencimento(null);
    setValorTotal(null);
    setValorJuros(null);
    setValorMulta(null);
    setRateios({});
    setMemorialOpen(false);
  }, [grupo.id, convenioIdInicial, parcelaInicial]);

  const jurosN = valorJuros ?? 0;
  const multaN = valorMulta ?? 0;
  const principal =
    valorTotal != null && valorTotal >= 0.01
      ? roundMoney(valorTotal - jurosN - multaN)
      : null;
  const encargosOk =
    valorTotal == null || principal == null || principal >= 0.01;

  const somaRateio = useMemo(() => {
    let total = 0;
    for (const m of membrosOrdenados) {
      const v = rateios[m.contratoId];
      if (v == null || !Number.isFinite(v)) return null;
      total += v;
    }
    return roundMoney(total);
  }, [membrosOrdenados, rateios]);

  const rateioBatePrincipal =
    principal != null &&
    somaRateio != null &&
    Math.abs(somaRateio - principal) <= 0.009;

  function redistribuirPrincipal(principalAlvo: number, pesosBase?: number[]) {
    const pesos =
      pesosBase && pesosBase.length === membrosOrdenados.length
        ? pesosBase
        : membrosOrdenados.map(() => 1);
    const partes = rateioProporcional(principalAlvo, pesos);
    const next: Record<number, number | null> = {};
    membrosOrdenados.forEach((m, i) => {
      next[m.contratoId] = partes[i] ?? 0;
    });
    setRateios(next);
  }

  function ratearIgual() {
    if (principal == null || principal < 0.01) {
      toast.error("Informe o valor total e encargos válidos antes de ratear.");
      return;
    }
    redistribuirPrincipal(principal);
    toast.success("Principal rateado igualmente entre os lotes.");
  }

  const podeEmitir =
    convenioId != null &&
    parcela != null &&
    parcela >= 1 &&
    vencimento != null &&
    isVencimentoFuturo(vencimento) &&
    valorTotal != null &&
    valorTotal >= 0.01 &&
    encargosOk &&
    rateioBatePrincipal;

  async function emitir() {
    if (!podeEmitir || !convenioId || !vencimento || parcela == null || valorTotal == null) {
      return;
    }
    if (principal == null || principal < 0.01) {
      toast.error("A soma de juros e multa deve ser menor que o valor total do boleto.");
      return;
    }
    setEmitindo(true);
    try {
      const membros = membrosOrdenados.map((m) => ({
        contratoId: m.contratoId,
        valorNominal: rateios[m.contratoId] ?? 0,
      }));
      const res = await finService.emitirCobrancaGrupo(
        grupo.id,
        {
          convenioId,
          vencimento: formatDateIso(vencimento),
          numeroParcela: parcela,
          membros,
          valorJuros: jurosN > 0 ? jurosN : undefined,
          valorMulta: multaN > 0 ? multaN : undefined,
        },
        `grupo-avulso-${grupo.id}-p${parcela}-${formatDateIso(vencimento)}`,
      );
      toast.success(`Título avulso consolidado emitido — ${formatMoney(res.valorTotal)}`);
      router.push(`/dashboard/financeiro/titulos?highlight=${res.titulo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao emitir título avulso do grupo.");
    } finally {
      setEmitindo(false);
    }
  }

  return (
    <div className={`${SUBCARD_CLASS} flex flex-col gap-5`} role="tabpanel">
      <p className="text-sm text-white/50 leading-relaxed">
        Mesmo tratamento do título avulso: informe o valor total do boleto (face Unicred), juros e
        multa. O principal (= total − juros − multa) é rateado entre os lotes do grupo e o boleto
        sai no contrato líder.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Convênio</label>
          <Dropdown
            value={convenioId}
            options={convenioOptions}
            onChange={(e) => setConvenioId(e.value ?? null)}
            placeholder="Selecione"
            className="w-full"
            pt={DROPDOWN_PT}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Parcela</label>
          <InputNumber
            value={parcela}
            onValueChange={(e) => setParcela(e.value ?? null)}
            min={1}
            useGrouping={false}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Vencimento do boleto</label>
          <DashboardCalendar
            value={vencimento}
            onChange={(e) => setVencimento(normalizarDataCalendario(e.value))}
            minDate={inicioDoDiaHoje()}
            placeholder="00/00/0000"
            mask="99/99/9999"
          />
          <p className="text-xs text-white/35">Hoje ou data futura.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Valor total do boleto (face)</label>
          <InputNumber
            value={valorTotal}
            onValueChange={(e) => {
              setValorTotal(e.value ?? null);
            }}
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            minFractionDigits={2}
            min={0.01}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Juros embutidos (R$)</label>
          <InputNumber
            value={valorJuros}
            onValueChange={(e) => setValorJuros(e.value ?? null)}
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            minFractionDigits={2}
            min={0}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={FORM_LABEL_CLASS}>Multa embutida (R$)</label>
          <InputNumber
            value={valorMulta}
            onValueChange={(e) => setValorMulta(e.value ?? null)}
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            minFractionDigits={2}
            min={0}
            className="w-full"
            inputClassName={FORM_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMemorialOpen(true)}
          className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-violet-100 hover:bg-violet-500/25"
        >
          Calculadora valor presente
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/[0.08] disabled:opacity-40"
          disabled={principal == null || principal < 0.01}
          onClick={() => ratearIgual()}
        >
          Ratear principal igualmente
        </button>
      </div>

      <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.08] p-4 space-y-2 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/80">
          Resumo
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Face Unicred</p>
            <p className="font-semibold text-emerald-300/90">{formatMoney(valorTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Principal</p>
            <p className="font-medium text-white/85">{formatMoney(principal)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Juros</p>
            <p className="font-medium text-white/85">{formatMoney(jurosN)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Multa</p>
            <p className="font-medium text-white/85">{formatMoney(multaN)}</p>
          </div>
        </div>
        {!encargosOk ? (
          <p className="text-xs text-amber-300/80">
            A soma de juros e multa deve ser menor que o valor total do boleto.
          </p>
        ) : null}
        <p className="text-xs text-white/40">
          Parcela {parcela ?? "—"} · líder{" "}
          {grupo.membros.find((m) => m.contratoId === grupo.contratoLiderId)?.numeroContrato ??
            grupo.contratoLiderId}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white/85">Rateio do principal por lote</h3>
            <p className="text-xs text-white/35 mt-1">
              Soma deve ser {formatMoney(principal)}. Juros e multa são rateados na proporção do
              principal na baixa.
            </p>
          </div>
          {somaRateio != null && principal != null ? (
            <p
              className={`text-xs ${
                rateioBatePrincipal ? "text-emerald-300/80" : "text-amber-300/80"
              }`}
            >
              Soma rateio: {formatMoney(somaRateio)}
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
                <th className="pb-2 pr-3">Contrato</th>
                <th className="pb-2 pr-3">Lote</th>
                <th className="pb-2 pr-3">Principal (R$)</th>
                <th className="pb-2">Juros / multa (prop.)</th>
              </tr>
            </thead>
            <tbody>
              {membrosOrdenados.map((m) => {
                const princ = rateios[m.contratoId];
                const peso = princ != null && princ >= 0 ? princ : 0;
                const somaPesos = membrosOrdenados.reduce((s, x) => {
                  const v = rateios[x.contratoId];
                  return s + (v != null && v >= 0 ? v : 0);
                }, 0);
                const j =
                  somaPesos > 0 && jurosN > 0 ? roundMoney((jurosN * peso) / somaPesos) : 0;
                const mt =
                  somaPesos > 0 && multaN > 0 ? roundMoney((multaN * peso) / somaPesos) : 0;
                return (
                  <tr key={m.contratoId} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white/70 font-mono text-xs">
                      {m.numeroContrato}
                    </td>
                    <td className="py-2 pr-3 text-white/45 text-xs">
                      {loteLabel(m.quadra, m.lote)}
                    </td>
                    <td className="py-2 pr-3">
                      <InputNumber
                        value={princ ?? null}
                        onValueChange={(e) =>
                          setRateios((prev) => ({
                            ...prev,
                            [m.contratoId]: e.value ?? null,
                          }))
                        }
                        mode="currency"
                        currency="BRL"
                        locale="pt-BR"
                        minFractionDigits={2}
                        min={0}
                        className="w-full max-w-[10rem]"
                        inputClassName={FORM_INPUT_CLASS}
                      />
                    </td>
                    <td className="py-2 text-xs text-white/40">
                      {formatMoney(j)} / {formatMoney(mt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={!podeEmitir || emitindo}
          onClick={() => void emitir()}
        >
          {emitindo ? "Emitindo…" : "Emitir título avulso consolidado"}
        </button>
        {!podeEmitir ? (
          <p className="text-xs text-white/40 mt-2">
            Preencha face, vencimento, parcela, convênio e rateio do principal (soma = principal).
          </p>
        ) : null}
      </div>

      <TituloAvulsoMemorialDialog
        visible={memorialOpen}
        onHide={() => setMemorialOpen(false)}
        principalInicial={principal != null && principal >= 0.01 ? principal : valorTotal}
        onUsarValor={(aplicacao) => {
          setValorTotal(aplicacao.valorTotal);
          setValorJuros(aplicacao.valorJuros > 0 ? aplicacao.valorJuros : null);
          setValorMulta(aplicacao.valorMulta > 0 ? aplicacao.valorMulta : null);
          const pesosAtuais = membrosOrdenados.map((m) => rateios[m.contratoId] ?? 0);
          const temPesos = pesosAtuais.every((p) => p >= 0.01);
          redistribuirPrincipal(
            aplicacao.valorPrincipal,
            temPesos ? pesosAtuais : undefined,
          );
          toast.success(
            `Calculadora aplicada — face ${formatMoney(aplicacao.valorTotal)}; principal rateado nos lotes.`,
          );
        }}
      />
    </div>
  );
}
