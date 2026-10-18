import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { renderNotificationEmail } from '../lib/emailTemplateRender.js';
import { sanitizeEmailHtml } from './emailSignature.js';
import { sendNoReplyEmail, type NoReplySendResult } from './noReplyEmail.js';

// Los jobs terminados se olvidan pasado este tiempo (evita crecer sin límite).
const JOB_TTL_MS = 10 * 60 * 1000;

export type StartMaintenanceNoticeFailure =
    | 'template_not_assigned'
    | 'no_recipients';

export class StartMaintenanceNoticeError extends Error {
    readonly reason: StartMaintenanceNoticeFailure;

    constructor(reason: StartMaintenanceNoticeFailure) {
        super(reason);

        this.name = 'StartMaintenanceNoticeError';
        this.reason = reason;
    }
}

// Igual formato que personLabel() del frontend (features/events/lib/events.ts).
export interface MaintenanceNoticeResult extends NoReplySendResult {
    label: string;
}

export interface MaintenanceNoticeRecipient {
    email: string;
    label: string;
}

export interface MaintenanceNoticeJob {
    id: string;
    actorId: string;
    total: number;
    sent: number;
    failed: number;
    done: boolean;
    // Lista completa conocida desde el principio: el frontend calcula quién
    // está en curso restando los ya procesados (results), igual que SendEmailDialog.
    recipients: MaintenanceNoticeRecipient[];
    results: MaintenanceNoticeResult[];
    createdAt: number;
}

// En memoria: es una acción puntual iniciada por una persona; si el
// servidor se reinicia a mitad, ese envío concreto se pierde (asumible).
const jobs = new Map<string, MaintenanceNoticeJob>();

const scheduleCleanup = (jobId: string) => {
    setTimeout(() => jobs.delete(jobId), JOB_TTL_MS).unref();
};

// Solo el actor que inició el envío puede consultar su progreso.
export const getMaintenanceNoticeJob = (
    jobId: string,
    actorId: string,
): MaintenanceNoticeJob | undefined => {
    const job = jobs.get(jobId);

    return job?.actorId === actorId ? job : undefined;
};

const maintenanceDateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const personLabel = (person: { name: string; puntoVuela: string | null }) =>
    person.puntoVuela ? `${person.puntoVuela} (${person.name})` : person.name;

export const startMaintenanceNotice = async (
    actorId: string,
    from: Date,
    to: Date,
    reason: string,
): Promise<{ jobId: string }> => {
    const assignment = await prisma.emailTemplateAssignment.findUnique({
        where: { slot: 'mantenimiento' },
        select: { template: true },
    });

    if (!assignment?.template) {
        throw new StartMaintenanceNoticeError('template_not_assigned');
    }

    const users = await prisma.user.findMany({
        where: {
            active: true,
            roleId: { not: 'admin' },
            email: { not: { startsWith: 'demo-' } },
        },
        select: { email: true, name: true, puntoVuela: true },
        orderBy: { puntoVuela: 'asc' },
    });

    if (users.length === 0) {
        throw new StartMaintenanceNoticeError('no_recipients');
    }

    const { subject, body } = renderNotificationEmail(
        assignment.template,
        {
            desde: maintenanceDateTimeFormat.format(from),
            hasta: maintenanceDateTimeFormat.format(to),
            motivo: sanitizeEmailHtml(reason),
        },
        ['motivo'],
    );

    const labelByEmail = new Map(
        users.map((user) => [user.email, personLabel(user)]),
    );

    const jobId = randomUUID();
    const job: MaintenanceNoticeJob = {
        id: jobId,
        actorId,
        total: users.length,
        sent: 0,
        failed: 0,
        done: false,
        recipients: users.map((user) => ({
            email: user.email,
            label: personLabel(user),
        })),
        results: [],
        createdAt: Date.now(),
    };

    jobs.set(jobId, job);

    void runMaintenanceNoticeJob(job, {
        to: users.map((user) => user.email),
        subject,
        html: body,
        labelByEmail,
    });

    return { jobId };
};

const runMaintenanceNoticeJob = async (
    job: MaintenanceNoticeJob,
    ctx: {
        to: string[];
        subject: string;
        html: string;
        labelByEmail: Map<string, string>;
    },
) => {
    try {
        await sendNoReplyEmail({
            to: ctx.to,
            subject: ctx.subject,
            html: ctx.html,
            onProgress: (result) => {
                if (result.ok) {
                    job.sent += 1;
                } else {
                    job.failed += 1;
                }

                job.results.push({
                    ...result,
                    label: ctx.labelByEmail.get(result.email) ?? result.email,
                });
            },
        });
    } catch (e) {
        // sendNoReplyEmail solo llega aquí si falla antes de intentar enviar
        // nada (p. ej. SMTP sin configurar): se marca todo como fallido para
        // que el informe no quede a medias.
        const message = e instanceof Error ? e.message : 'Error desconocido';

        for (const email of ctx.to) {
            if (!job.results.some((r) => r.email === email)) {
                job.results.push({
                    email,
                    ok: false,
                    error: message,
                    label: ctx.labelByEmail.get(email) ?? email,
                });
                job.failed += 1;
            }
        }

        logger.error({ err: e }, 'No se pudo enviar el aviso de mantenimiento');
    } finally {
        job.done = true;
        scheduleCleanup(job.id);
    }
};
