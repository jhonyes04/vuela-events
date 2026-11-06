import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { notificationBus } from '../lib/eventBus.js';

export type NotificationType =
    | 'registration_created'
    | 'registration_cancelled'
    | 'event_updated'
    | 'event_cancelled'
    | 'event_reminder'
    | 'new_project'
    | 'new_event_in_project'
    | 'new_user_registered'
    | 'role_changed'
    | 'maintenance_notice'
    | 'broadcast'
    | 'new_survey';

const NOTIFICATION_RETENTION_DAYS = 30;

interface NotifyInput {
    type: NotificationType;
    title: string;
    body?: string;
    eventId?: string;
}

// Best-effort: un fallo aquí no debe tumbar la acción principal (inscripción, edición de evento, etc...)
// Mismo criterio que avisos por email
export const notifyUsers = async (
    userIds: string[],
    input: NotifyInput,
): Promise<void> => {
    if (userIds.length === 0) return;

    try {
        await prisma.notification.createMany({
            data: userIds.map((userId) => ({ userId, ...input })),
        });

        for (const userId of userIds) {
            notificationBus.emit(userId);
        }
    } catch (e) {
        logger.error(
            { err: e },
            `No se pudo crear la notificación ${input.type}`,
        );
    }
};

// Avisa en vivo sin crear notificación (no todo lo que cambia en tiempo real
// merece quedar en el historial, p. ej. que una encuesta se ha cerrado).
export const pingUsers = (userIds: string[]): void => {
    for (const userId of userIds) {
        notificationBus.emit(userId);
    }
};

// Resuelve destinatarios activos por rol (o todos los activos si no se pasa roles)
// Excluye opcionalmente a quien hizo la acción
export const getActiveUserIds = async (opts?: {
    roles?: string[];
    excludeRoles?: string[];
    excludeUserId?: string;
}): Promise<string[]> => {
    const users = await prisma.user.findMany({
        where: {
            active: true,
            ...(opts?.roles && { roleId: { in: opts.roles } }),
            ...(opts?.excludeRoles && {
                roleId: { notIn: opts.excludeRoles },
            }),
            ...(opts?.excludeUserId && { id: { not: opts.excludeUserId } }),
        },
        select: { id: true },
    });

    return users.map((user) => user.id);
};

// Mensaje libre de un dt/admin. Si lo manda un dt, no llega a otros dt ni a
// admin (solo a ail/roles personalizados); si lo manda un admin, llega a
// todos menos admin (dt incluido). Devuelve a cuántos llegó.
export const sendBroadcastNotification = async (
    actorId: string,
    actorRoleId: string,
    title: string,
    body: string,
): Promise<number> => {
    const excludeRoles = actorRoleId === 'dt' ? ['dt', 'admin'] : ['admin'];

    const userIds = await getActiveUserIds({
        excludeRoles,
        excludeUserId: actorId,
    });

    await notifyUsers(userIds, { type: 'broadcast', title, body });

    return userIds.length;
};

// Borrado automático: una notificación de hace más de 30 días (leída o no)
// ya no aporta, igual criterio que auditoría y log de emails.
export const pruneOldNotifications = async (): Promise<number> => {
    const cutoff = new Date(
        Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const { count } = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoff } },
    });

    return count;
};
