import { create } from 'zustand';
import { registerCatalogResetter } from '@/lib/createCatalogStore';
import { openNotificationStream } from '@/features/notifications/lib/notificationStream';
import {
    listNotifications,
    type AppNotification,
} from '@/features/notifications/lib/notifications';

interface NotificationsState {
    unread: AppNotification[];
    unreadCount: number;
    streamStarted: boolean;
    changeTick: number;
    refresh: () => void;
    ensureStream: () => void;
    markLocalRead: (id: string) => void;
    markAllLocalRead: () => void;
}

let source: EventSource | null = null;

const initial = {
    unread: [] as AppNotification[],
    unreadCount: 0,
    streamStarted: false,
    changeTick: 0,
};

export const useNotificationsStore = create<NotificationsState>(
    (set, get) => ({
        ...initial,
        refresh: () => {
            void listNotifications()
                .then((list) => {
                    const unread = list.filter((n) => !n.readAt);

                    set({ unread, unreadCount: unread.length });
                })
                .catch(() => {});
        },
        // Idempotente: campanita y menú de usuario la llaman cada uno al
        // montar, pero solo el primero abre la conexión.
        ensureStream: () => {
            if (get().streamStarted) return;
            set({ streamStarted: true });

            get().refresh();
            source = openNotificationStream(() => {
                get().refresh();
                set((state) => ({ changeTick: state.changeTick + 1 }));
            });
        },
        markLocalRead: (id) =>
            set((state) => ({
                unread: state.unread.filter((n) => n.id !== id),
                unreadCount: Math.max(0, state.unreadCount - 1),
            })),
        markAllLocalRead: () => set({ unread: [], unreadCount: 0 }),
    }),
);

registerCatalogResetter(() => {
    source?.close();
    source = null;
    useNotificationsStore.setState(initial);
});
