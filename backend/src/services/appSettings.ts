import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { renderNotificationEmail } from '../lib/emailTemplateRender.js';
import { sendNoReplyEmail } from './noReplyEmail.js';

const APP_SETTINGS_ID = 'default';

export type UserMenuStyle = 'dropdown' | 'sheet';

export interface AppSettingsData {
    userMenuStyle: UserMenuStyle;
    maintenanceMode: boolean;
}

export const getAppSettings = async (): Promise<AppSettingsData> => {
    const settings = await prisma.appSettings.findUnique({
        where: { id: APP_SETTINGS_ID },
    });

    return {
        userMenuStyle: (settings?.userMenuStyle as UserMenuStyle) ?? 'dropdown',
        maintenanceMode: settings?.maintenanceMode ?? false,
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

const maintenanceDateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

export const sendMaintenanceNotice = async (
    from: Date,
    to: Date,
    reason: string,
): Promise<void> => {
    const assignment = await prisma.emailTemplateAssignment.findUnique({
        where: { slot: 'mantenimiento' },
        select: { template: true },
    });

    if (!assignment?.template)
        throw new Error('No hay plantilla asignada al aviso de mantenimiento');

    const users = await prisma.user.findMany({
        where: { active: true },
        select: { email: true },
    });

    if (users.length === 0) return;

    const { subject, body } = renderNotificationEmail(assignment.template, {
        desde: maintenanceDateTimeFormat.format(from),
        hasta: maintenanceDateTimeFormat.format(to),
        motivo: reason,
    });

    try {
        await sendNoReplyEmail({
            to: users.map((user) => user.email),
            subject,
            html: body,
        });
    } catch (e) {
        logger.error({ err: e }, 'No se pudo enviar el aviso de mantenimiento');

        throw e;
    }
};
