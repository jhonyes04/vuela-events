import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { recordAudit } from './audit.js';

export type RegistrationFailure =
    | 'not_found'
    | 'already_registered'
    | 'event_full'
    | 'event_ended'
    | 'admin_not_allowed';

export class RegistrationError extends Error {
    readonly reason: RegistrationFailure;

    constructor(reason: RegistrationFailure) {
        super(reason);

        this.name = 'RegistrationError';
        this.reason = reason;
    }
}

export const registerForEvent = async (
    userId: string,
    eventId: string,
    opts?: { actorId?: string; bypassCapacity?: boolean },
) => {
    try {
        return await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT 1 FROM "events" WHERE "id" = ${eventId}::uuid FOR UPDATE`;

            const event = await tx.event.findUnique({
                where: { id: eventId },
                select: { capacity: true, endsAt: true, title: true },
            });

            if (!event) {
                throw new RegistrationError('not_found');
            }

            if (event.endsAt <= new Date()) {
                throw new RegistrationError('event_ended');
            }

            const registrant = await tx.user.findUnique({
                where: { id: userId },
                select: { roleId: true },
            });

            if (registrant?.roleId === 'admin') {
                throw new RegistrationError('admin_not_allowed');
            }

            const already = await tx.registration.findUnique({
                where: { eventId_userId: { eventId, userId } },
                select: { id: true },
            });

            if (already) {
                throw new RegistrationError('already_registered');
            }

            if (
                !opts?.bypassCapacity &&
                event.capacity !== null &&
                registrant?.roleId !== 'dt'
            ) {
                const taken = await tx.registration.count({
                    where: { eventId, user: { roleId: { not: 'dt' } } },
                });

                if (taken >= event.capacity) {
                    throw new RegistrationError('event_full');
                }
            }

            const registration = await tx.registration.create({
                data: { eventId, userId },
                select: { id: true, eventId: true, createdAt: true },
            });

            const actorId = opts?.actorId ?? userId;

            await tx.auditLog.create({
                data: {
                    actorId,
                    // Solo se registra el objetivo cuando lo da de alta otra persona (admin).
                    ...(actorId !== userId && { targetId: userId }),
                    action: 'event_registered',
                    newValue: event.title.slice(0, 100),
                },
            });

            return registration;
        });
    } catch (e) {
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
        ) {
            throw new RegistrationError('already_registered');
        }

        throw e;
    }
};

export const unregisterFromEvent = async (
    userId: string,
    eventId: string,
): Promise<void> => {
    const { count } = await prisma.registration.deleteMany({
        where: { eventId, userId },
    });

    if (count === 0) {
        throw new RegistrationError('not_found');
    }

    await recordAudit({
        action: 'event_unregistered',
        actorId: userId,
        newValue: eventId,
    });
};

export const unregisterRegistration = async (
    actorId: string,
    eventId: string,
    registrationId: string,
): Promise<void> => {
    const registration = await prisma.registration.findFirst({
        where: { id: registrationId, eventId },
        select: { userId: true },
    });

    if (!registration) {
        throw new RegistrationError('not_found');
    }

    await prisma.registration.delete({ where: { id: registrationId } });

    await recordAudit({
        action: 'event_unregistered',
        actorId,
        targetId: registration.userId,
        newValue: eventId,
    });
};

export interface Attendee {
    id: string;
    name: string;
    puntoVuela: string | null;
}

// Personas inscritas, para mostrarlas en la ficha del evento. Devuelve solo lo
// necesario (nombre y Punto Vuela): nunca correos ni identificadores de usuario.
// Los DT no aparecen nunca, igual que en los recuentos.
export const listAttendees = async (eventId: string): Promise<Attendee[]> => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
    });

    if (!event) {
        throw new RegistrationError('not_found');
    }

    const rows = await prisma.registration.findMany({
        where: { eventId, user: { roleId: { not: 'dt' } } },
        select: {
            id: true,
            user: { select: { name: true, puntoVuela: true } },
        },
        orderBy: [{ user: { puntoVuela: 'asc' } }, { user: { name: 'asc' } }],
    });

    return rows.map((row) => ({
        id: row.id,
        name: row.user.name,
        puntoVuela: row.user.puntoVuela,
    }));
};

export interface RegistrationCandidate {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    registered: boolean;
}

export const listRegistrationCandidates = async (
    eventId: string,
): Promise<RegistrationCandidate[]> => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
    });

    if (!event) {
        throw new RegistrationError('not_found');
    }

    const users = await prisma.user.findMany({
        where: { active: true, roleId: 'ail' },
        select: {
            id: true,
            name: true,
            lastName: true,
            puntoVuela: true,
            registrations: {
                where: { eventId },
                select: { id: true },
                take: 1,
            },
        },
        orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((user) => ({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        puntoVuela: user.puntoVuela,
        registered: user.registrations.length > 0,
    }));
};
