import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { expandRecurrence, type RecurrenceRule } from '../lib/recurrence.js';

export interface SeriesInput {
    title: string;
    subtitle?: string | undefined;
    description?: string | undefined;
    location: string;
    capacity?: number | undefined;
    rule: RecurrenceRule;
}

// Crea todas las sesiones en una sola transacción: o se crean todas o ninguna.
// Lanza RecurrenceError si la regla no es válida (antes de tocar la base de datos).
export const createEventSeries = async (
    actorId: string,
    input: SeriesInput,
) => {
    const sessions = expandRecurrence(input.rule);
    const seriesId = randomUUID();

    await prisma.$transaction(async (tx) => {
        await tx.event.createMany({
            data: sessions.map((session) => ({
                title: input.title,
                subtitle: input.subtitle,
                description: input.description,
                location: input.location,
                capacity: input.capacity,
                startsAt: session.startsAt,
                endsAt: session.endsAt,
                createdById: actorId,
                seriesId,
            })),
        });

        await tx.auditLog.create({
            data: {
                actorId,
                action: 'event_series_created',
                newValue: `${sessions.length} sesiones`,
            },
        });
    });

    return {
        seriesId,
        count: sessions.length,
        firstStartsAt: sessions[0]!.startsAt,
    };
};
