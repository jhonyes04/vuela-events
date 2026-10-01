import { create } from 'zustand';
import type { User } from '@/lib/api';
import { resetCatalogStores } from '@/lib/createCatalogStore';

interface AuthState {
    user: User | null;
    // true mientras se comprueba si ya hay una sesión abierta
    loading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => {
        // Al cerrar sesión se vacían los catálogos en caché.
        if (user === null) resetCatalogStores();

        set({ user });
    },
    setLoading: (loading) => set({ loading }),
}));
