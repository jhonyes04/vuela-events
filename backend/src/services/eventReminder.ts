import { prisma } from '../lib/prisma.js';
import { notifyUsers } from './notification.js';
import { buildEventSummary } from '../lib/emailTemplateRender.js';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Recordatorio único por inscripción antes de empezar. No se repite
export const sendDueEventReminders = async (): Promise<number> => {
    const now = new Date();
    const threshold = new Date(now.getTime() + TWO_HOURS_MS);

    const due = await prisma.registration.findMany({
        where: {
            reminderSentAt: null,
            user: { roleId: { not: 'dt' } },
            event: { startsAt: { gt: now, lte: threshold } },
        },
        select: {
            id: true,
            userId: true,
            event: {
                select: {
                    id: true,
                    title: true,
                    startsAt: true,
                    endsAt: true,
                    location: true,
                },
            },
        },
    });

    if (due.length === 0) return 0;

    await Promise.all(
        due.map((registration) =>
            notifyUsers([registration.userId], {
                type: 'event_reminder',
                title: 'Recordatorio de evento',
                body: buildEventSummary(registration.event),
                eventId: registration.event.id,
            }),
        ),
    );

    await prisma.registration.updateMany({
        where: { id: { in: due.map((r) => r.id) } },
        data: { reminderSentAt: now },
    });

    return due.length;
};
