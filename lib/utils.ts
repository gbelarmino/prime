import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Mescla classes Tailwind sem conflitos (padrão shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
