import { api } from '@/lib/api';

export type UserMenuStyle = 'dropdown' | 'sheet';

export interface AppSettingsData {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
}

export const getAppSettings = (): Promise<AppSettingsData> =>
    api.get('/app-settings');

export const setUserMenuStyle = (
    userMenuStyle: UserMenuStyle,
): Promise<{ userMenuStyle: UserMenuStyle }> =>
    api.patch('/app-settings/user-menu-style', { userMenuStyle });

export const setMaintenanceMode = (
    maintenanceMode: boolean,
): Promise<{ maintenanceMode: boolean }> =>
    api.patch('/app-settings/maintenance-mode', { maintenanceMode });

// Sin autenticar: lo consulta App.tsx antes de saber quién es el usuario.
export const getMaintenanceStatus = (): Promise<{ maintenanceMode: boolean }> =>
    api.get('/maintenance-status');
