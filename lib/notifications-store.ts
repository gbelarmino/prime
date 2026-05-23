import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  link?: string;
  dataHora: string;
  lida: boolean;
}

interface NotificationsState {
  notifications: Notificacao[];
  unreadCount: number;
  addNotification: (notification: Notificacao) => void;
  setNotifications: (notifications: Notificacao[]) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearUnread: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification: Notificacao) =>
        set((state: NotificationsState) => {
          const exists = state.notifications.some((n) => n.id === notification.id);
          if (exists) return state;

          return {
            notifications: [notification, ...state.notifications].slice(0, 30),
            unreadCount: state.unreadCount + 1,
          };
        }),

      setNotifications: (notifications: Notificacao[]) =>
        set(() => ({
          notifications,
          unreadCount: notifications.filter((n) => !n.lida).length,
        })),

      markAsRead: (id: number) =>
        set((state: NotificationsState) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, lida: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllAsRead: () =>
        set((state: NotificationsState) => ({
          notifications: state.notifications.map((n) => ({ ...n, lida: true })),
          unreadCount: 0,
        })),

      clearUnread: () =>
        set(() => ({
          unreadCount: 0,
        })),
    }),
    {
      name: 'aires-notifications-storage',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? sessionStorage : localStorage
      ),
    }
  )
);
