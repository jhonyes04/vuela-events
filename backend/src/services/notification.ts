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
    | 'maintenance_notice';

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

// Resuelve destinatarios activos por rol (o todos los activos si no se pasa roles)
// Excluye opcionalmente a quien hizo la acción
export const getActiveUserIds = async (opts?: {
    roles?: string[];
    excludeUserId?: string;
}): Promise<string[]> => {
    const users = await prisma.user.findMany({
        where: {
            active: true,
            ...(opts?.roles && { roleId: { in: opts.roles } }),
            ...(opts?.excludeUserId && { id: { not: opts.excludeUserId } }),
        },
        select: { id: true },
    });

    return users.map((user) => user.id);
};
