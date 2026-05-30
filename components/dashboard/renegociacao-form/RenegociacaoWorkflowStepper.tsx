"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const RENEGOCIACAO_WIZARD_STEPS = [
  { id: "visao", label: "Visão geral", icon: "pi pi-eye" },
  { id: "modalidade", label: "Modalidade", icon: "pi pi-list" },
  { id: "parametros", label: "Parâmetros", icon: "pi pi-sliders-h" },
  { id: "simulacao", label: "Simulação", icon: "pi pi-chart-line" },
  { id: "aprovacao", label: "Aprovação", icon: "pi pi-verified" },
  { id: "documentos", label: "Documentos", icon: "pi pi-file-pdf" },
  { id: "efetivacao", label: "Efetivação", icon: "pi pi-check-circle" },
] as const;

type Props = {
  activeStep: number;
  onStepClick?: (step: number) => void;
};

export function RenegociacaoWorkflowStepper({ activeStep, onStepClick }: Props) {
  const maxIndex = RENEGOCIACAO_WIZARD_STEPS.length - 1;
  const progress = maxIndex > 0 ? (activeStep / maxIndex) * 100 : 0;

  return (
    <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="relative flex items-center justify-between px-2 md:px-4">
        <div className="absolute left-8 right-8 top-5 z-0 hidden h-0.5 -translate-y-1/2 bg-white/5 md:top-6 md:block">
          <motion.div
            className="h-full bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: "circOut" }}
          />
        </div>

        {RENEGOCIACAO_WIZARD_STEPS.map((step, idx) => {
          const done = idx < activeStep;
          const current = idx === activeStep;
          const canNavigate = idx < activeStep && onStepClick;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-1 md:gap-2">
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onStepClick(idx)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 md:h-11 md:w-11",
                  current &&
                    "scale-110 border-violet-400 bg-violet-600 text-white shadow-lg shadow-violet-600/40",
                  done && !current && "border-emerald-400 bg-emerald-500 text-white",
                  !done && !current && "border-white/10 bg-[#071C33] text-white/20",
                  canNavigate && "cursor-pointer hover:scale-105",
                  !canNavigate && "cursor-default",
                )}
              >
                <i className={cn(done && !current ? "pi pi-check" : step.icon, "text-sm md:text-base")} />
              </button>
              <span
                className={cn(
                  "hidden max-w-[5.5rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wider md:block",
                  current && "text-violet-400",
                  done && !current && "text-emerald-400",
                  !done && !current && "text-white/20",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 md:hidden">
        Etapa {activeStep + 1} de {RENEGOCIACAO_WIZARD_STEPS.length} ·{" "}
        {RENEGOCIACAO_WIZARD_STEPS[activeStep]?.label}
      </p>
    </div>
  );
}
