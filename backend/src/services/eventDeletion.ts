import { prisma } from '../lib/prisma.js';
import { notifyEventCancelled } from './eventNotify.js';

export type EventDeleteFailure = 'not_found' | 'forbidden';

export class EventDeleteError extends Error {
    readonly reason: EventDeleteFailure;

    constructor(reason: EventDeleteFailure) {
        super(reason);

        this.name = 'EventDeleteError';
        this.reason = reason;
    }
}

// Elimina UNA sesión. Solo un admin o quien creó el evento. Las inscripciones
// se borran en cascada; la auditoría conserva qué se eliminó y cuántas había.
export const deleteEvent = async (
    actor: { id: string; roleId: string },
    eventId: string,
    reason?: string,
): Promise<void> => {
    const event = await prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
            where: { id: eventId },
            select: {
                title: true,
                location: true,
                startsAt: true,
                endsAt: true,
                createdById: true,
                project: { select: { name: true } },
                // Solo las inscripciones visibles: los DT nunca cuentan, ni
                // para el recuento de auditoría ni para el aviso de cancelación.
                registrations: {
                    where: { user: { roleId: { not: 'dt' } } },
                    select: { user: { select: { email: true } } },
                },
            },
        });

        if (!event) {
            throw new EventDeleteError('not_found');
        }

        if (actor.roleId !== 'admin' && event.createdById !== actor.id) {
            throw new EventDeleteError('forbidden');
        }

        await tx.event.delete({ where: { id: eventId } });

        await tx.auditLog.create({
            data: {
                actorId: actor.id,
                action: 'event_deleted',
                // oldValue admite 100 caracteres.
                oldValue:
                    `${event.startsAt.toISOString().slice(0, 10)} ${event.title}`.slice(
                        0,
                        100,
                    ),
                newValue:
                    event.registrations.length === 1
                        ? '1 inscripción'
                        : `${event.registrations.length} inscripciones`,
            },
        });

        return event;
    });

    void notifyEventCancelled({
        title: event.title,
        location: event.location,
        projectName: event.project.name,
        reason,
        sessions: [
            {
                startsAt: event.startsAt,
                endsAt: event.endsAt,
                registrantEmails: event.registrations.map((r) => r.user.email),
            },
        ],
    });
};

// Elimina las sesiones FUTURAS de una serie (las pasadas se quedan como
// historial). Solo un admin o quien creó la serie.
export const deleteEventSeries = async (
    actor: { id: string; roleId: string },
    seriesId: string,
    reason?: string,
): Promise<{ deletedCount: number }> => {
    const events = await prisma.$transaction(async (tx) => {
        const events = await tx.event.findMany({
            where: { seriesId, startsAt: { gt: new Date() } },
            select: {
                title: true,
                location: true,
                startsAt: true,
                endsAt: true,
                createdById: true,
                project: { select: { name: true } },
                registrations: {
                    where: { user: { roleId: { not: 'dt' } } },
                    select: { user: { select: { email: true } } },
                },
            },
        });

        if (events.length === 0) {
            throw new EventDeleteError('not_found');
        }

        const creatorId = events[0]!.createdById;

        if (actor.roleId !== 'admin' && creatorId !== actor.id) {
            throw new EventDeleteError('forbidden');
        }

        const totalRegistrations = events.reduce(
            (sum, e) => sum + e.registrations.length,
            0,
        );

        await tx.event.deleteMany({
            where: { seriesId, startsAt: { gt: new Date() } },
        });

        await tx.auditLog.create({
            data: {
                actorId: actor.id,
                action: 'event_series_deleted',
                oldValue:
                    `${events[0]!.title} (${events.length} sesiones futuras)`.slice(
                        0,
                        100,
                    ),
                newValue:
                    totalRegistrations === 1
                        ? '1 inscripción'
                        : `${totalRegistrations} inscripciones`,
            },
        });

        return events;
    });

    const first = events[0]!;

    void notifyEventCancelled({
        title: first.title,
        location: first.location,
        projectName: first.project.name,
        reason,
        sessions: events.map((event) => ({
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            registrantEmails: event.registrations.map((r) => r.user.email),
        })),
    });

    return { deletedCount: events.length };
};
