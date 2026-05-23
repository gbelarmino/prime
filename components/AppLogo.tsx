import Image from "next/image";
import { cn } from "@/lib/utils";

export const APP_LOGO_SRC = "/images/logo.jpeg";

export function AppLogo({ boxClassName, className }: { boxClassName?: string; className?: string }) {
  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-xl", boxClassName, className)}>
      <Image
        src={APP_LOGO_SRC}
        alt="Aires Logo"
        width={150}
        height={150}
        className="object-cover w-full h-full"
        priority
      />
    </span>
  );
}
