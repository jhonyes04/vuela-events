import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

export type RegistrationFailure =
    | 'not_found'
    | 'already_registered'
    | 'event_full'
    | 'event_ended';

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
                select: { capacity: true, endsAt: true },
            });

            if (!event) {
                throw new RegistrationError('not_found');
            }

            if (event.endsAt <= new Date()) {
                throw new RegistrationError('event_ended');
            }

            const already = await tx.registration.findUnique({
                where: { eventId_userId: { eventId, userId } },
                select: { id: true },
            });

            if (already) {
                throw new RegistrationError('already_registered');
            }

            if (event.capacity !== null) {
                const taken = await tx.registration.count({
                    where: { eventId },
                });

                if (taken >= event.capacity) {
                    throw new RegistrationError('event_full');
                }
            }

            return tx.registration.create({
                data: { eventId, userId },
                select: { id: true, eventId: true, createdAt: true },
            });
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
};
