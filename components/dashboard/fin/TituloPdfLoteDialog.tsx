"use client";

import { useMemo } from "react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { cn } from "@/lib/utils";
import {
  formatContratoRef,
  type TituloCobranca,
  type TituloPdfLoteResult,
} from "@/lib/fin-service";

const DIALOG_PT = {
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "bg-transparent px-6 py-6" },
  footer: { className: "border-t border-white/[0.06] bg-transparent px-6 py-5" },
  mask: { className: "backdrop-blur-sm bg-black/40" },
};

const PDF_LOTE_MAX = 50;

type GrupoContrato = {
  contratoId: number;
  numeroContrato?: string | null;
  titulos: TituloCobranca[];
};

type TituloPdfLoteDialogProps = {
  visible: boolean;
  onHide: () => void;
  titulos: TituloCobranca[];
  resultado?: TituloPdfLoteResult | null;
  onConfirm: () => void;
  loading?: boolean;
};

function agruparPorContrato(titulos: TituloCobranca[]): GrupoContrato[] {
  const map = new Map<number, GrupoContrato>();
  for (const t of titulos) {
    const g = map.get(t.contratoId) ?? {
      contratoId: t.contratoId,
      numeroContrato: t.numeroContrato,
      titulos: [],
    };
    g.titulos.push(t);
    map.set(t.contratoId, g);
  }
  return [...map.values()].map((g) => ({
    ...g,
    titulos: g.titulos.slice().sort((a, b) => a.numeroParcela - b.numeroParcela),
  }));
}

export function TituloPdfLoteDialog({
  visible,
  onHide,
  titulos,
  resultado,
  onConfirm,
  loading = false,
}: TituloPdfLoteDialogProps) {
  const grupos = useMemo(() => agruparPorContrato(titulos), [titulos]);
  const confirmando = !resultado;

  return (
    <DashboardDialog
      header={confirmando ? "Baixar PDF em lote" : "Resultado do download"}
      visible={visible}
      onHide={onHide}
      className={cn(
        "w-full border border-white/10 bg-[#071C33] shadow-2xl",
        confirmando ? "max-w-lg" : "max-w-xl",
      )}
      pt={DIALOG_PT}
      modal
      draggable={false}
      footer={
        <div className="flex justify-end gap-3">
          {confirmando ? (
            <>
              <button
                type="button"
                onClick={onHide}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || titulos.length === 0 || titulos.length > PDF_LOTE_MAX}
                onClick={onConfirm}
                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading
                  ? "A baixar e mesclar…"
                  : `Baixar ${titulos.length} boleto${titulos.length === 1 ? "" : "s"}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onHide}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-900/30 transition hover:bg-amber-500"
            >
              Fechar
            </button>
          )}
        </div>
      }
    >
      {confirmando ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            O sistema obtém cada boleto (Unicred ou PDF interno), mescla num único arquivo PDF e
            inicia o download. Todos os títulos precisam estar disponíveis; se algum falhar, nenhum
            arquivo é gerado.
          </p>
          {titulos.length > PDF_LOTE_MAX ? (
            <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
              Selecione no máximo {PDF_LOTE_MAX} títulos por operação.
            </p>
          ) : null}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10">
            {grupos.map((grupo) => (
              <div
                key={grupo.contratoId}
                className="border-b border-white/[0.06] px-4 py-3 last:border-b-0"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                  {formatContratoRef(grupo.numeroContrato, grupo.contratoId)}
                </p>
                <p className="mt-1 text-sm text-white/75">
                  Parcelas: {grupo.titulos.map((t) => t.numeroParcela).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : resultado ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            Não foi possível obter todos os PDFs.{" "}
            <span className="font-semibold text-rose-300">{resultado.falhas}</span> falha(s) de{" "}
            {resultado.total}.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0a2540] text-[10px] font-bold uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-4 py-3">Parcela</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-white/70">
                {resultado.itens.map((item) => {
                  const titulo = titulos.find((t) => t.id === item.tituloId);
                  return (
                    <tr key={item.tituloId} className="bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono">
                        {titulo
                          ? `${formatContratoRef(titulo.numeroContrato, titulo.contratoId)} · ${titulo.numeroParcela}`
                          : item.tituloId.slice(0, 8)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5",
                          item.sucesso ? "text-emerald-300/90" : "text-rose-300/90",
                        )}
                      >
                        {item.sucesso ? "OK" : item.mensagem ?? "Erro"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </DashboardDialog>
  );
}
