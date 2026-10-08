import { create } from 'zustand';
import { ApiError } from '@/lib/api';
import { registerCatalogResetter } from '@/lib/createCatalogStore';
import {
    listResourceLinks,
    type ResourceLink,
} from '@/features/resources/lib/resourceLinks';

// Store propio: createCatalogStore exige un campo "name" para ordenar, y
// aquí el campo se llama "title".
interface ResourceLinksState {
    items: ResourceLink[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    load: (force?: boolean) => Promise<void>;
    upsert: (item: ResourceLink) => void;
    remove: (id: string) => void;
}

const byTitle = (a: ResourceLink, b: ResourceLink) =>
    a.title.localeCompare(b.title);

let pending: Promise<void> | null = null;

const initial = {
    items: [] as ResourceLink[],
    loading: true,
    loaded: false,
    error: null as string | null,
};

export const useResourceLinksStore = create<ResourceLinksState>(
    (set, get) => ({
        ...initial,
        load: (force = false) => {
            if (pending) return pending;
            if (get().loaded && !force) return Promise.resolve();

            if (!get().loaded) set({ loading: true });

            set({ error: null });

            pending = listResourceLinks()
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
            set((state) => ({
                items: state.items.filter((i) => i.id !== id),
            })),
    }),
);

registerCatalogResetter(() => {
    pending = null;
    useResourceLinksStore.setState(initial);
});
