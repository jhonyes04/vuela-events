import { create } from 'zustand';
import { ApiError } from '@/lib/api';
import { registerCatalogResetter } from '@/lib/createCatalogStore';
import {
    listDocuments,
    type Document,
} from '@/features/resources/lib/documents';

interface DocumentsState {
    items: Document[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    load: (force?: boolean) => Promise<void>;
    upsert: (item: Document) => void;
    remove: (id: string) => void;
}

const byTitle = (a: Document, b: Document) => a.title.localeCompare(b.title);
let pending: Promise<void> | null = null;
const initial = {
    items: [] as Document[],
    loading: true,
    loaded: false,
    error: null as string | null,
};

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
    ...initial,
    load: (force = false) => {
        if (pending) return pending;
        if (get().loaded && !force) return Promise.resolve();
        if (!get().loaded) set({ loading: true });
        set({ error: null });

        pending = listDocuments()
            .then((items) => set({ items, loaded: true }))
            .catch((e: unknown) =>
                set({
                    error:
                        e instanceof ApiError
                            ? e.message
                            : 'No se pudo cargar la lista',
                }),
            )
            .finally(() => {
                set({ loading: false });
                pending = null;
            });

        return pending;
    },
    upsert: (item) =>
        set((state) => {
            const exists = state.items.some((i) => i.id === item.id);
            return {
                items: (exists
                    ? state.items.map((i) => (i.id === item.id ? item : i))
                    : [...state.items, item]
                ).sort(byTitle),
            };
        }),
    remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));

registerCatalogResetter(() => {
    pending = null;
    useDocumentsStore.setState(initial);
});
