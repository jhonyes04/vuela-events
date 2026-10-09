import { prisma } from '../lib/prisma.js';

const APP_SETTINGS_ID = 'default';

export type UserMenuStyle = 'dropdown' | 'sheet';

export const getAppSettings = async (): Promise<{
    userMenuStyle: UserMenuStyle;
}> => {
    const settings = await prisma.appSettings.findUnique({
        where: { id: APP_SETTINGS_ID },
    });

    return {
        userMenuStyle: (settings?.userMenuStyle as UserMenuStyle) ?? 'dropdown',
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
