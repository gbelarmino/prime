"use client";

import { useEffect } from "react";
import { useLoadingStore } from "@/lib/loading-store";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function GlobalSpinner() {
  const { isLoading, message } = useLoadingStore();
  
  // Bloquear scroll do body quando o spinner estiver ativo
  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 w-screen h-screen z-[999999] flex flex-col items-center justify-center bg-black/5 backdrop-blur-[1px] cursor-wait select-none pointer-events-auto"
        >
          {/* Noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none brightness-100 contrast-150" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
            }}
          />
          
          <div className="relative flex flex-col items-center">
            {/* Círculos de brilho ao fundo */}
            <div className="absolute -inset-10 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
            <div className="absolute -inset-4 bg-indigo-500/10 blur-xl rounded-full" />
            
            {/* Spinner principal */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="relative z-10"
            >
              <Loader2 className="text-blue-400 w-16 h-16" strokeWidth={1.5} />
            </motion.div>

            {/* Mensagem opcional */}
            {message && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-6 text-white/40 text-[10px] font-black uppercase tracking-[0.4em] z-10 text-center px-6"
              >
                {message}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
