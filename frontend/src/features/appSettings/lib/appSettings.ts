import { api } from '@/lib/api';

export type UserMenuStyle = 'dropdown' | 'sheet';

export const getAppSettings = (): Promise<{ userMenuStyle: UserMenuStyle }> =>
    api.get('/app-settings');

export const setUserMenuStyle = (
    userMenuStyle: UserMenuStyle,
): Promise<{ userMenuStyle: UserMenuStyle }> =>
    api.patch('/app-settings/user-menu-style', { userMenuStyle });
