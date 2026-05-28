import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_BRAND_NAME, APP_LOGO_SRC } from "@/lib/app-brand";

export { APP_LOGO_SRC };

export function AppLogo({
  boxClassName,
  className,
  imageClassName,
}: {
  boxClassName?: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span className={cn("relative inline-block shrink-0", boxClassName, className)}>
      <Image
        src={APP_LOGO_SRC}
        alt={APP_BRAND_NAME}
        width={250}
        height={250}
        className={cn("object-contain w-full h-full", imageClassName)}
        priority
      />
    </span>
  );
}
