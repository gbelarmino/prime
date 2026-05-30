"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const ADITIVO_WIZARD_STEPS = [
  { id: "config", label: "Configuração", icon: "pi pi-sliders-h" },
  { id: "condicoes", label: "Condições", icon: "pi pi-wallet" },
  { id: "simular", label: "Simulação", icon: "pi pi-chart-line" },
  { id: "publicar", label: "Publicação", icon: "pi pi-send" },
] as const;

type Props = {
  activeStep: number;
  onStepClick?: (step: number) => void;
};

export function AditivoWorkflowStepper({ activeStep, onStepClick }: Props) {
  const maxIndex = ADITIVO_WIZARD_STEPS.length - 1;
  const progress = maxIndex > 0 ? (activeStep / maxIndex) * 100 : 0;

  return (
    <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="relative flex items-center justify-between px-2 md:px-4">
        <div className="absolute left-8 right-8 top-6 z-0 hidden h-0.5 -translate-y-1/2 bg-white/5 md:block">
          <motion.div
            className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: "circOut" }}
          />
        </div>

        {ADITIVO_WIZARD_STEPS.map((step, idx) => {
          const done = idx < activeStep;
          const current = idx === activeStep;
          const canNavigate = idx < activeStep && onStepClick;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 md:gap-3">
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onStepClick(idx)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 md:h-12 md:w-12",
                  current &&
                    "scale-110 border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-600/40",
                  done && !current && "border-emerald-400 bg-emerald-500 text-white",
                  !done && !current && "border-white/10 bg-[#071C33] text-white/20",
                  canNavigate && "cursor-pointer hover:scale-105",
                  !canNavigate && "cursor-default",
                )}
              >
                <i className={cn(done && !current ? "pi pi-check" : step.icon, "text-base md:text-lg")} />
              </button>
              <span
                className={cn(
                  "hidden text-center text-[9px] font-bold uppercase tracking-widest md:block md:max-w-[5.5rem]",
                  current && "text-blue-400",
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
        Etapa {activeStep + 1} de {ADITIVO_WIZARD_STEPS.length} · {ADITIVO_WIZARD_STEPS[activeStep]?.label}
      </p>
    </div>
  );
}
