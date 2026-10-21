import { create } from 'zustand';
import {
    getAppSettings,
    type UserMenuStyle,
} from '@/features/appSettings/lib/appSettings';

interface AppSettingsState {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
    projectOpeningSections: string[];
    projectClosingSections: string[];
    loaded: boolean;
    load: () => Promise<void>;
    setUserMenuStyle: (style: UserMenuStyle) => void;
    setMaintenanceMode: (value: boolean) => void;
    setProjectSections: (opening: string[], closing: string[]) => void;
}

// Ajuste global (una sola fila en el servidor): basta un store simple, sin
// el patrón de lista de createCatalogStore.
export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
    userMenuStyle: 'dropdown',
    maintenanceMode: false,
    projectOpeningSections: [],
    projectClosingSections: [],
    loaded: false,
    load: async () => {
        if (get().loaded) return;

        try {
            const {
                userMenuStyle,
                maintenanceMode,
                projectOpeningSections,
                projectClosingSections,
            } = await getAppSettings();
            set({
                userMenuStyle,
                maintenanceMode,
                projectOpeningSections,
                projectClosingSections,
                loaded: true,
            });
        } catch {
            set({ loaded: true });
        }
    },
    setUserMenuStyle: (userMenuStyle) => set({ userMenuStyle }),
    setMaintenanceMode: (maintenanceMode) => set({ maintenanceMode }),
    setProjectSections: (projectOpeningSections, projectClosingSections) =>
        set({ projectOpeningSections, projectClosingSections }),
}));
