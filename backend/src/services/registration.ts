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

export const registerForEvent = async (userId: string, eventId: string) => {
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

            // Un admin nunca se inscribe: solo organiza.
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

            // Un DT nunca cuenta como inscrito ni ocupa plaza.
            if (event.capacity !== null && registrant?.roleId !== 'dt') {
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

            await tx.auditLog.create({
                data: {
                    actorId: userId,
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

export interface Attendee {
    id: string;
    name: string;
    puntoVuela: string | null;
    avatarConfigured: boolean;
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
            user: {
                select: { name: true, puntoVuela: true, avatarImage: true },
            },
        },
        orderBy: [
            { user: { puntoVuela: 'asc' } },
            { user: { name: 'asc' } },
        ],
    });

    return rows.map((row) => ({
        id: row.id,
        name: row.user.name,
        puntoVuela: row.user.puntoVuela,
        avatarConfigured: row.user.avatarImage !== null,
    }));
};

// La clave pública sigue siendo el id del registro, nunca el del usuario:
// mismo criterio de privacidad que listAttendees.
export const getAttendeeAvatar = async (
    eventId: string,
    registrationId: string,
): Promise<{ data: Buffer; contentType: string } | null> => {
    const row = await prisma.registration.findFirst({
        where: { id: registrationId, eventId },
        select: {
            user: { select: { avatarImage: true, avatarImageType: true } },
        },
    });

    if (!row?.user.avatarImage) return null;

    return {
        data: Buffer.from(row.user.avatarImage),
        contentType: row.user.avatarImageType ?? 'image/jpeg',
    };
};
