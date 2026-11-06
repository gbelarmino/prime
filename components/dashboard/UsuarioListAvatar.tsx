"use client";

import { useEffect, useState } from "react";
import { Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchUsuarioAvatarObjectUrl } from "@/lib/usuario-avatar";

type UsuarioListAvatarProps = {
  usuarioId: number;
  nome?: string | null;
  temAvatar?: boolean;
  isAdmin?: boolean;
  className?: string;
};

export function UsuarioListAvatar({
  usuarioId,
  nome,
  temAvatar,
  isAdmin,
  className,
}: UsuarioListAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const clear = () => {
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };

    if (!temAvatar) {
      clear();
      return;
    }

    fetchUsuarioAvatarObjectUrl(usuarioId)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {
        if (!cancelled) clear();
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [usuarioId, temAvatar]);

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden transition-colors shrink-0",
        src
          ? "bg-[#1E293B] border border-white/10"
          : isAdmin
            ? "bg-amber-500/10 text-amber-400"
            : "bg-blue-500/10 text-blue-400",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={nome || ""} className="h-full w-full object-cover" />
      ) : nome?.trim() ? (
        <span className="text-sm font-bold">{nome.trim().charAt(0).toUpperCase()}</span>
      ) : isAdmin ? (
        <Shield size={18} />
      ) : (
        <Users size={18} />
      )}
    </div>
  );
}
