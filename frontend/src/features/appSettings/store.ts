import { create } from 'zustand';
import {
    getAppSettings,
    type UserMenuStyle,
} from '@/features/appSettings/lib/appSettings';

interface AppSettingsState {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
    maintenanceFrom: string | null;
    maintenanceTo: string | null;
    projectOpeningSections: string[];
    projectClosingSections: string[];
    loaded: boolean;
    load: () => Promise<void>;
    setUserMenuStyle: (style: UserMenuStyle) => void;
    setMaintenanceMode: (value: boolean) => void;
    setMaintenanceSchedule: (from: string | null, to: string | null) => void;
    setProjectSections: (opening: string[], closing: string[]) => void;
}

// Ajuste global (una sola fila en el servidor): basta un store simple, sin
// el patrón de lista de createCatalogStore.
export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
    userMenuStyle: 'dropdown',
    maintenanceMode: false,
    maintenanceFrom: null,
    maintenanceTo: null,
    projectOpeningSections: [],
    projectClosingSections: [],
    loaded: false,
    load: async () => {
        if (get().loaded) return;

        try {
            const {
                userMenuStyle,
                maintenanceMode,
                maintenanceFrom,
                maintenanceTo,
                projectOpeningSections,
                projectClosingSections,
            } = await getAppSettings();
            set({
                userMenuStyle,
                maintenanceMode,
                maintenanceFrom,
                maintenanceTo,
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
    setMaintenanceSchedule: (maintenanceFrom, maintenanceTo) =>
        set({ maintenanceFrom, maintenanceTo }),
    setProjectSections: (projectOpeningSections, projectClosingSections) =>
        set({ projectOpeningSections, projectClosingSections }),
}));
