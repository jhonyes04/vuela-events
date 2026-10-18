import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { recordAudit } from './audit.js';
import { logger } from '../lib/logger.js';
import {
    renderEmail,
    type RenderableEvent,
} from '../lib/emailTemplateRender.js';
import { sendNoReplyEmail } from './noReplyEmail.js';

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

// Aviso best-effort: si no hay plantilla asignada o falla el envío, no debe
// tumbar la inscripción/cancelación (es una notificación, no el efecto principal).
const notifyRegistrationChange = async (
    slot: 'inscripcion' | 'cancelacion_inscripcion',
    event: RenderableEvent,
    userEmail: string,
) => {
    try {
        const assignment = await prisma.emailTemplateAssignment.findUnique({
            where: { slot },
            select: { template: true },
        });

        if (!assignment?.template) return;

        const { subject, body } = renderEmail(assignment.template, event);

        await sendNoReplyEmail({ to: [userEmail], subject, html: body });
    } catch (e) {
        logger.error({ err: e }, `No se pudo enviar el aviso de ${slot}`);
    }
};

export const registerForEvent = async (
    userId: string,
    eventId: string,
    opts?: {
        actorId?: string;
        bypassCapacity?: boolean;
        allowAfterEnd?: boolean;
    },
) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT 1 FROM "events" WHERE "id" = ${eventId}::uuid FOR UPDATE`;

            const event = await tx.event.findUnique({
                where: { id: eventId },
                select: {
                    capacity: true,
                    endsAt: true,
                    startsAt: true,
                    title: true,
                    location: true,
                    projectId: true,
                    project: { select: { name: true } },
                },
            });

            if (!event) {
                throw new RegistrationError('not_found');
            }

            if (!opts?.allowAfterEnd && event.endsAt <= new Date()) {
                throw new RegistrationError('event_ended');
            }

            const registrant = await tx.user.findUnique({
                where: { id: userId },
                select: { roleId: true, email: true },
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

            if (registrant?.roleId === 'ail') {
                await tx.userProjectPreference.upsert({
                    where: {
                        userId_projectId: {
                            userId,
                            projectId: event.projectId,
                        },
                    },
                    create: { userId, projectId: event.projectId },
                    update: {},
                });
            }

            const actorId = opts?.actorId ?? userId;

            await tx.auditLog.create({
                data: {
                    actorId,
                    ...(actorId !== userId && { targetId: userId }),
                    action: 'event_registered',
                    newValue: event.title.slice(0, 100),
                },
            });

            return { registration, event, userEmail: registrant?.email };
        });

        if (result.userEmail) {
            void notifyRegistrationChange(
                'inscripcion',
                { ...result.event, projectName: result.event.project.name },
                result.userEmail,
            );
        }

        return result.registration;
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
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            title: true,
            location: true,
            startsAt: true,
            endsAt: true,
            project: { select: { name: true } },
        },
    });

    if (!event) {
        throw new RegistrationError('not_found');
    }

    if (event.endsAt <= new Date()) {
        throw new RegistrationError('event_ended');
    }

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

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    if (user) {
        void notifyRegistrationChange(
            'cancelacion_inscripcion',
            { ...event, projectName: event.project.name },
            user.email,
        );
    }
};

export const unregisterRegistration = async (
    actorId: string,
    eventId: string,
    registrationId: string,
    opts?: { allowAfterEnd?: boolean },
): Promise<void> => {
    const registration = await prisma.registration.findFirst({
        where: { id: registrationId, eventId },
        select: {
            userId: true,
            user: { select: { email: true } },
            event: {
                select: {
                    endsAt: true,
                    title: true,
                    location: true,
                    startsAt: true,
                    project: { select: { name: true } },
                },
            },
        },
    });

    if (!registration) {
        throw new RegistrationError('not_found');
    }

    if (!opts?.allowAfterEnd && registration.event.endsAt <= new Date()) {
        throw new RegistrationError('event_ended');
    }

    await prisma.registration.delete({ where: { id: registrationId } });

    await recordAudit({
        action: 'event_unregistered',
        actorId,
        targetId: registration.userId,
        newValue: eventId,
    });

    void notifyRegistrationChange(
        'cancelacion_inscripcion',
        {
            ...registration.event,
            projectName: registration.event.project.name,
        },
        registration.user.email,
    );
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
    projectPreferences: { id: string; name: string; color: string }[];
}

export const listRegistrationCandidates = async (
    eventId: string,
): Promise<RegistrationCandidate[]> => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, projectId: true },
    });

    if (!event) {
        throw new RegistrationError('not_found');
    }

    const users = await prisma.user.findMany({
        where: {
            active: true,
            roleId: 'ail',
            projectPreferences: { some: { projectId: event.projectId } },
        },
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
            projectPreferences: {
                select: {
                    project: { select: { id: true, name: true, color: true } },
                },
            },
        },
        orderBy: [{ puntoVuela: 'asc' }, { name: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((user) => ({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        puntoVuela: user.puntoVuela,
        registered: user.registrations.length > 0,
        projectPreferences: user.projectPreferences.map((p) => p.project),
    }));
};
