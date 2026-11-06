import { create } from 'zustand';
import { registerCatalogResetter } from '@/lib/createCatalogStore';
import { openNotificationStream } from '@/features/notifications/lib/notificationStream';
import {
    getPendingSurvey,
    type PendingSurvey,
} from '@/features/surveys/lib/surveys';

interface PendingSurveyState {
    survey: PendingSurvey | null;
    streamStarted: boolean;
    open: boolean;
    refresh: () => void;
    // Idempotente: diálogo y menús la llaman cada uno al montar, pero solo
    // el primero abre la conexión SSE (se reutiliza la de notificaciones:
    // activar/reabrir una encuesta ya crea una notificación ahí).
    ensureStream: () => void;
    openDialog: () => void;
    closeDialog: () => void;
    clear: () => void;
}

let source: EventSource | null = null;

const initial = {
    survey: null as PendingSurvey | null,
    streamStarted: false,
    open: false,
};

export const usePendingSurveyStore = create<PendingSurveyState>(
    (set, get) => ({
        ...initial,
        refresh: () => {
            void getPendingSurvey()
                .then((survey) => set({ survey }))
                .catch(() => {});
        },
        ensureStream: () => {
            if (get().streamStarted) return;
            set({ streamStarted: true });

            get().refresh();
            source = openNotificationStream(() => get().refresh());
        },
        openDialog: () => set({ open: true }),
        closeDialog: () => set({ open: false }),
        clear: () => set({ survey: null, open: false }),
    }),
);

registerCatalogResetter(() => {
    source?.close();
    source = null;
    usePendingSurveyStore.setState(initial);
});
