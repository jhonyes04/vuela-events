import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
    renderNotificationEmail,
    formatSessionDateTime,
} from '../lib/emailTemplateRender.js';
import { sendNoReplyEmail } from './noReplyEmail.js';
import { env } from '../config/env.js';

interface EventSession {
    startsAt: Date;
    endsAt: Date;
}

// Siempre un bloque propio (párrafo o lista): la plantilla coloca {{fechas}}
// directo, sin tener que envolverlo.
const buildFechasBlock = (sessions: EventSession[]): string =>
    sessions.length === 1
        ? `<p>${formatSessionDateTime(sessions[0]!.startsAt, sessions[0]!.endsAt)}</p>`
        : `<ul>${sessions
              .map(
                  (session) =>
                      `<li>${formatSessionDateTime(session.startsAt, session.endsAt)}</li>`,
              )
              .join('')}</ul>`;

interface NewEventNotifyInput {
    title: string;
    location: string | null;
    projectId: string;
    // Una sesión suelta, o todas las de una serie recién creada.
    sessions: EventSession[];
}

// Aviso best-effort a quien marcó el proyecto como interés (AIL), igual
// criterio que notifyProjectCreated/notifyRegistrationChange: nunca bloquea
// ni tumba la creación del evento o la serie.
export const notifyEventCreated = async (
    event: NewEventNotifyInput,
    excludeUserId: string,
) => {
    try {
        const [assignment, project] = await Promise.all([
            prisma.emailTemplateAssignment.findUnique({
                where: { slot: 'evento_nuevo' },
                select: { template: true },
            }),
            prisma.project.findUnique({
                where: { id: event.projectId },
                select: { name: true },
            }),
        ]);

        if (!assignment?.template || !project) return;

        const users = await prisma.user.findMany({
            where: {
                active: true,
                id: { not: excludeUserId },
                email: { not: { startsWith: 'demo-' } },
                roleId: 'ail',
                projectPreferences: { some: { projectId: event.projectId } },
            },
            select: { email: true },
        });

        if (users.length === 0) return;

        const { subject, body } = renderNotificationEmail(
            assignment.template,
            {
                proyecto: project.name,
                evento: event.title,
                lugar: event.location ?? '',
                fechas: buildFechasBlock(event.sessions),
                enlacePerfil: `${env.FRONTEND_ORIGIN}/perfil`,
            },
            ['fechas'],
        );

        await sendNoReplyEmail({
            to: users.map((user) => user.email),
            subject,
            html: body,
        });
    } catch (e) {
        logger.error({ err: e }, 'No se pudo enviar el aviso de evento_nuevo');
    }
};

interface CancelledSession extends EventSession {
    // Solo quien estaba inscrito en ESTA sesión concreta (no todo el que
    // marcó el proyecto como interés).
    registrantEmails: string[];
}

interface EventCancelledInput {
    title: string;
    location: string | null;
    projectName: string;
    // Una sesión suelta, o todas las sesiones futuras eliminadas de una serie.
    sessions: CancelledSession[];
}

// Aviso best-effort a quienes tenían inscripción en lo que se acaba de
// eliminar. Cada destinatario ve solo SUS fechas canceladas (en una serie,
// puede estar inscrito solo en algunas sesiones, no en todas).
export const notifyEventCancelled = async (event: EventCancelledInput) => {
    try {
        const assignment = await prisma.emailTemplateAssignment.findUnique({
            where: { slot: 'evento_cancelado' },
            select: { template: true },
        });

        if (!assignment?.template) return;

        const sessionsByEmail = new Map<string, EventSession[]>();

        for (const session of event.sessions) {
            for (const email of session.registrantEmails) {
                if (email.startsWith('demo-')) continue;

                const list = sessionsByEmail.get(email) ?? [];

                list.push({ startsAt: session.startsAt, endsAt: session.endsAt });
                sessionsByEmail.set(email, list);
            }
        }

        if (sessionsByEmail.size === 0) return;

        for (const [email, sessions] of sessionsByEmail) {
            const { subject, body } = renderNotificationEmail(
                assignment.template,
                {
                    proyecto: event.projectName,
                    evento: event.title,
                    lugar: event.location ?? '',
                    fechas: buildFechasBlock(sessions),
                },
                ['fechas'],
            );

            await sendNoReplyEmail({ to: [email], subject, html: body });
        }
    } catch (e) {
        logger.error(
            { err: e },
            'No se pudo enviar el aviso de evento_cancelado',
        );
    }
};
