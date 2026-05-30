"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormSectionAccent = "blue" | "amber" | "emerald";

const ACCENT_BAR: Record<FormSectionAccent, string> = {
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
};

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  accent?: FormSectionAccent;
  contentClassName?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
  accent = "blue",
  contentClassName,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "relative rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-md shadow-2xl",
        className
      )}
    >
      {title && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("h-6 w-1 rounded-full", ACCENT_BAR[accent])} />
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-sm text-white/40 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <div className={cn("grid grid-cols-1 gap-8 md:grid-cols-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
