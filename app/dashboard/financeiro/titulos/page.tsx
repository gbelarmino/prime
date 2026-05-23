"use client";

import { Suspense, useCallback, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { Button } from "primereact/button";
import { TituloLegadoManualDialog } from "@/components/dashboard/fin/TituloLegadoManualDialog";
import { TitulosList } from "@/components/dashboard/fin/TitulosList";

export default function TitulosPage() {
  const [showNovo, setShowNovo] = useState(false);
  const [showLegadoManual, setShowLegadoManual] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const onLegadoCreated = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400 mb-2">
            Gestão Financeira
          </div>
          <h1 className="text-4xl font-bold text-white mt-1 font-[family-name:var(--font-playfair)]">
            Títulos de cobrança
          </h1>
          <p className="text-white/40 mt-1 max-w-xl leading-relaxed font-medium">
            Boletos e cobrança vinculados aos contratos. Fase 1 — operação via API, sem filas externas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={() => setShowLegadoManual(true)}
            className="bg-amber-700/90 hover:bg-amber-600 border-none rounded-full px-6 py-4 flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-amber-900/25"
          >
            <Archive size={18} className="text-white shrink-0" />
            <span className="text-xs font-black text-white uppercase tracking-widest">
              Lançamento manual legado
            </span>
          </Button>
          <Button
            type="button"
            onClick={() => setShowNovo(true)}
            className="bg-blue-600 hover:bg-blue-500 border-none rounded-full px-8 py-4 flex items-center gap-5 transition-all active:scale-95 shadow-2xl shadow-blue-600/30 group"
          >
            <span className="text-sm font-black text-white uppercase tracking-widest">NOVO</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <Plus size={18} className="text-white" />
            </div>
          </Button>
        </div>
      </div>

      <TituloLegadoManualDialog
        visible={showLegadoManual}
        onHide={() => setShowLegadoManual(false)}
        onCreated={onLegadoCreated}
      />

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <Suspense
          fallback={
            <div className="p-12 text-center text-white/20 font-medium animate-pulse">
              Carregando títulos…
            </div>
          }
        >
          <TitulosList
            key={listRefreshKey}
            showNovo={showNovo}
            onShowNovoChange={setShowNovo}
          />
        </Suspense>
      </div>
    </div>
  );
}
