import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { expandRecurrence, type RecurrenceRule } from '../lib/recurrence.js';
import { notifyEventCreated } from './eventNotify.js';

export interface SeriesInput {
    title: string;
    subtitle?: string | undefined;
    description?: string | undefined;
    location: string;
    modality: string;
    capacity?: number | undefined;
    projectId: string;
    guideId: string;
    materialIds: string[];
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
                modality: input.modality,
                capacity: input.capacity,
                projectId: input.projectId,
                guideId: input.guideId,
                startsAt: session.startsAt,
                endsAt: session.endsAt,
                createdById: actorId,
                seriesId,
            })),
        });

        if (input.materialIds.length > 0) {
            const createdEvents = await tx.event.findMany({
                where: { seriesId },
                select: { id: true },
            });

            await tx.eventMaterial.createMany({
                data: createdEvents.flatMap((event) =>
                    input.materialIds.map((materialId) => ({
                        eventId: event.id,
                        materialId,
                    })),
                ),
            });
        }

        await tx.auditLog.create({
            data: {
                actorId,
                action: 'event_series_created',
                newValue: `${sessions.length} sesiones`,
            },
        });
    });

    void notifyEventCreated(
        {
            title: input.title,
            location: input.location,
            projectId: input.projectId,
            sessions: sessions.map((session) => ({
                startsAt: session.startsAt,
                endsAt: session.endsAt,
            })),
        },
        actorId,
    );

    return {
        seriesId,
        count: sessions.length,
        firstStartsAt: sessions[0]!.startsAt,
    };
};
