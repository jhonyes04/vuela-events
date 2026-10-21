import { prisma } from '../lib/prisma.js';

const APP_SETTINGS_ID = 'default';

export type UserMenuStyle = 'dropdown' | 'sheet';

export interface AppSettingsData {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
    projectOpeningSections: string[];
    projectClosingSections: string[];
}

export const getAppSettings = async (): Promise<AppSettingsData> => {
    const settings = await prisma.appSettings.findUnique({
        where: { id: APP_SETTINGS_ID },
    });

    return {
        userMenuStyle: (settings?.userMenuStyle as UserMenuStyle) ?? 'dropdown',
        maintenanceMode: settings?.maintenanceMode ?? false,
        projectOpeningSections: settings?.projectOpeningSections ?? [],
        projectClosingSections: settings?.projectClosingSections ?? [],
    };
};

export const setUserMenuStyle = async (
    userMenuStyle: UserMenuStyle,
): Promise<{ userMenuStyle: UserMenuStyle }> => {
    const settings = await prisma.appSettings.upsert({
        where: { id: APP_SETTINGS_ID },
        create: { id: APP_SETTINGS_ID, userMenuStyle },
        update: { userMenuStyle },
    });

    return { userMenuStyle: settings.userMenuStyle as UserMenuStyle };
};

export const setMaintenanceMode = async (
    maintenanceMode: boolean,
): Promise<{ maintenanceMode: boolean }> => {
    const settings = await prisma.appSettings.upsert({
        where: { id: APP_SETTINGS_ID },
        create: { id: APP_SETTINGS_ID, maintenanceMode },
        update: { maintenanceMode },
    });

    return { maintenanceMode: settings.maintenanceMode };
};

export const setProjectSections = async (
    projectOpeningSections: string[],
    projectClosingSections: string[],
): Promise<{
    projectOpeningSections: string[];
    projectClosingSections: string[];
}> => {
    const settings = await prisma.appSettings.upsert({
        where: { id: APP_SETTINGS_ID },
        create: {
            id: APP_SETTINGS_ID,
            projectOpeningSections,
            projectClosingSections,
        },

        update: { projectOpeningSections, projectClosingSections },
    });

    return {
        projectOpeningSections: settings.projectOpeningSections,
        projectClosingSections: settings.projectClosingSections,
    };
};

// Cache en memoria para no golpear la DB en cada request del middleware global.
let cached: { value: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5_000;

export const isMaintenanceModeActive = async (): Promise<boolean> => {
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const { maintenanceMode } = await getAppSettings();
    cached = { value: maintenanceMode, expiresAt: Date.now() + CACHE_TTL_MS };

    return maintenanceMode;
};

// El PATCH del propio ajuste debe reflejarse ya en la próxima request.
export const invalidateMaintenanceModeCache = (): void => {
    cached = null;
};
