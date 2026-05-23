"use client";

import React, { useState } from "react";
import { Bell, Info } from "lucide-react";
import { useNotificationsStore } from "@/lib/notifications-store";
import { useNotifications } from "@/hooks/use-notifications";
import { useRouter } from "next/navigation";
import { getNotificacaoMarcarLidaUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

export function NotificationBell() {
  // Ativa o hook de escuta SSE
  useNotifications();

  const { notifications, unreadCount, markAsRead, clearUnread } = useNotificationsStore();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) clearUnread();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="p-2 text-gray-400 hover:text-white transition-colors relative"
        aria-label="Notificações"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 z-50 overflow-hidden rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notificações</h3>
              <span className="text-xs text-gray-500">{notifications.length} totais</span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.filter(n => !n.lida).length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Nenhuma notificação por enquanto.
                </div>
              ) : (
                notifications.filter(n => !n.lida).map((n) => (
                  <div
                    key={n.id}
                    className={clsx(
                      "p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer",
                      !n.lida && "bg-blue-500/5"
                    )}
                    onClick={async () => {
                      markAsRead(n.id);
                      if (n.link) {
                        router.push(n.link);
                      }
                      
                      // Avisa o backend
                      try {
                        const url = getNotificacaoMarcarLidaUrl(n.id);
                        if (url) {
                          await apiFetch(url, { method: "PATCH", skipLoading: true });
                        }
                      } catch (err) {
                        console.error("Erro ao sincronizar leitura", err);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Info size={16} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-white leading-none">
                          {n.titulo}
                        </p>
                        <p className="text-xs text-gray-400 leading-tight">
                          {n.mensagem}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDistanceToNow(new Date(n.dataHora), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {!n.lida && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-gray-900 border-t border-gray-800 text-center">
                <button 
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
