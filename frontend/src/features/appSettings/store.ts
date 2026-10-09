import { create } from 'zustand';
import {
    getAppSettings,
    type UserMenuStyle,
} from '@/features/appSettings/lib/appSettings';

interface AppSettingsState {
    userMenuStyle: UserMenuStyle;
    loaded: boolean;
    load: () => Promise<void>;
    setUserMenuStyle: (style: UserMenuStyle) => void;
}

// Ajuste global (una sola fila en el servidor): basta un store simple, sin
// el patrón de lista de createCatalogStore.
export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
    userMenuStyle: 'dropdown',
    loaded: false,
    load: async () => {
        if (get().loaded) return;

        try {
            const { userMenuStyle } = await getAppSettings();
            set({ userMenuStyle, loaded: true });
        } catch {
            set({ loaded: true });
        }
    },
    setUserMenuStyle: (userMenuStyle) => set({ userMenuStyle }),
}));
