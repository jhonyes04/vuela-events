import { create } from 'zustand';
import { ApiError } from '@/lib/api';

interface CatalogItem {
    id: string;
    name: string;
}

export interface CatalogState<T extends CatalogItem> {
    items: T[];
    // true hasta que llega la primera respuesta (o fallo); las recargas posteriores no vacían la pantalla.
    loading: boolean;
    loaded: boolean;
    error: string | null;
    // Sin `force` solo pide los datos la primera vez; con `force` siempre los refresca.
    load: (force?: boolean) => Promise<void>;
    upsert: (item: T) => void;
    remove: (id: string) => void;
}

// Todos los catálogos se vacían al cerrar sesión para que otro usuario no vea datos ajenos.
const resetters = new Set<() => void>();

export const resetCatalogStores = () => {
    resetters.forEach((reset) => reset());
};

// Para stores de catálogo que no encajan en createCatalogStore (p. ej. porque
// no tienen un campo "name"), pero deben vaciarse igual al cerrar sesión.
export const registerCatalogResetter = (reset: () => void) => {
    resetters.add(reset);
};

const byName = (a: CatalogItem, b: CatalogItem) =>
    a.name.localeCompare(b.name);

export const createCatalogStore = <T extends CatalogItem>(
    fetchItems: () => Promise<T[]>,
    errorFallback = 'No se pudo cargar la lista',
) => {
    let pending: Promise<void> | null = null;

    const initial = {
        items: [] as T[],
        loading: true,
        loaded: false,
        error: null as string | null,
    };

    const useStore = create<CatalogState<T>>((set, get) => ({
        ...initial,
        load: (force = false) => {
            if (pending) return pending;
            if (get().loaded && !force) return Promise.resolve();

            if (!get().loaded) set({ loading: true });

            set({ error: null });

            pending = fetchItems()
                .then((items) => set({ items, loaded: true }))
                .catch((e: unknown) =>
                    set({
                        error: e instanceof ApiError ? e.message : errorFallback,
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
                    ).sort(byName),
                };
            }),
        remove: (id) =>
            set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    }));

    resetters.add(() => {
        pending = null;
        useStore.setState(initial);
    });

    return useStore;
};
