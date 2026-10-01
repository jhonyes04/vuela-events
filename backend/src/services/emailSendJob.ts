import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { renderEmail } from '../lib/emailTemplateRender.js';
import { getDecryptedAppPassword } from './profile.js';
import { generateAttendanceReport } from './attendanceReport.js';
import { type SlotId } from './emailSending.js';

const BATCH_SIZE = 15;
const PAUSE_MS = 5_000;
// Límite defensivo por si algo evita la validación del frontend.
const MAX_RECIPIENTS = 500;
// Los jobs terminados se olvidan pasado este tiempo (evita crecer sin límite).
const JOB_TTL_MS = 10 * 60 * 1000;

// en-CA da directamente el formato YYYY-MM-DD.
const fileDateFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export type StartSendFailure =
    | 'smtp_not_configured'
    | 'template_not_assigned'
    | 'event_not_found'
    | 'no_recipients'
    | 'app_password_not_configured'
    | 'report_generation_failed';

export class StartSendError extends Error {
    readonly reason: StartSendFailure;

    constructor(reason: StartSendFailure) {
        super(reason);

        this.name = 'StartSendError';
        this.reason = reason;
    }
}

interface RecipientResult {
    registrationId: string;
    ok: boolean;
    error?: string;
}

interface SendJob {
    id: string;
    total: number;
    sent: number;
    failed: number;
    done: boolean;
    results: RecipientResult[];
    createdAt: number;
}

// En memoria: es una acción puntual iniciada por una persona; si el
// servidor se reinicia a mitad, ese envío concreto se pierde (asumible).
const jobs = new Map<string, SendJob>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleCleanup = (jobId: string) => {
    setTimeout(() => jobs.delete(jobId), JOB_TTL_MS).unref();
};

export const getSendJob = (jobId: string): SendJob | undefined =>
    jobs.get(jobId);

interface StartSendInput {
    actorId: string;
    actorEmail: string;
    slot: SlotId;
    eventId: string;
    recipientRegistrationIds: string[];
}

export const startBulkSend = async (
    input: StartSendInput,
): Promise<{ jobId: string }> => {
    if (input.recipientRegistrationIds.length === 0) {
        throw new StartSendError('no_recipients');
    }

    const registrationIds = input.recipientRegistrationIds.slice(
        0,
        MAX_RECIPIENTS,
    );

    const smtpConfig = await prisma.smtpConfig.findUnique({
        where: { id: 'default' },
    });

    if (!smtpConfig) {
        throw new StartSendError('smtp_not_configured');
    }

    const smtpPassword = await getDecryptedAppPassword(input.actorId);

    if (!smtpPassword) {
        throw new StartSendError('app_password_not_configured');
    }

    const assignment = await prisma.emailTemplateAssignment.findUnique({
        where: { slot: input.slot },
        select: { template: true },
    });

    if (!assignment?.template) {
        throw new StartSendError('template_not_assigned');
    }

    const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        select: { title: true, location: true, startsAt: true, endsAt: true },
    });

    if (!event) {
        throw new StartSendError('event_not_found');
    }

    // Resuelto por inscripción, acotado a este evento: así nadie puede
    // colar el id de inscripción de otro evento para enviarse algo ajeno.
    const registrations = await prisma.registration.findMany({
        where: { id: { in: registrationIds }, eventId: input.eventId },
        select: { id: true, user: { select: { email: true } } },
    });
    const recipients = registrations.map((r) => ({
        registrationId: r.id,
        email: r.user.email,
    }));

    const template = assignment.template;
    const { subject, body } = renderEmail(template, event);

    // El parte de firmas lleva siempre adjunta el acta de asistencia en PDF
    // con los mismos destinatarios seleccionados, generada una sola vez.
    let attachment: { filename: string; content: Buffer } | undefined;

    if (input.slot === 'parte_firmas') {
        try {
            const pdf = await generateAttendanceReport({
                eventId: input.eventId,
                recipientRegistrationIds: registrationIds,
                signerUserId: input.actorId,
            });

            attachment = {
                filename: `${fileDateFormat.format(event.startsAt)} Acta de asistencia ${event.title}.pdf`,
                content: pdf,
            };
        } catch {
            throw new StartSendError('report_generation_failed');
        }
    }

    const jobId = randomUUID();
    const job: SendJob = {
        id: jobId,
        total: recipients.length,
        sent: 0,
        failed: 0,
        done: false,
        results: [],
        createdAt: Date.now(),
    };

    jobs.set(jobId, job);

    void runSendJob(job, {
        smtpConfig,
        actorEmail: input.actorEmail,
        smtpPassword,
        subject,
        body,
        attachment,
        recipients,
    });

    return { jobId };
};

const runSendJob = async (
    job: SendJob,
    ctx: {
        smtpConfig: { host: string; port: number; secure: boolean };
        actorEmail: string;
        smtpPassword: string;
        subject: string;
        body: string;
        attachment?: { filename: string; content: Buffer };
        recipients: { registrationId: string; email: string }[];
    },
) => {
    const transporter = nodemailer.createTransport({
        host: ctx.smtpConfig.host,
        port: ctx.smtpConfig.port,
        secure: ctx.smtpConfig.secure,
        auth: { user: ctx.actorEmail, pass: ctx.smtpPassword },
    });

    try {
        for (let i = 0; i < ctx.recipients.length; i += BATCH_SIZE) {
            const batch = ctx.recipients.slice(i, i + BATCH_SIZE);

            for (const recipient of batch) {
                try {
                    await transporter.sendMail({
                        from: ctx.actorEmail,
                        to: recipient.email,
                        subject: ctx.subject,
                        html: ctx.body,
                        attachments: ctx.attachment ? [ctx.attachment] : [],
                    });

                    job.sent += 1;
                    job.results.push({
                        registrationId: recipient.registrationId,
                        ok: true,
                    });
                } catch (e) {
                    job.failed += 1;
                    job.results.push({
                        registrationId: recipient.registrationId,
                        ok: false,
                        error:
                            e instanceof Error
                                ? e.message
                                : 'Error desconocido',
                    });
                }
            }

            const isLastBatch = i + BATCH_SIZE >= ctx.recipients.length;

            if (!isLastBatch) {
                await sleep(PAUSE_MS);
            }
        }
    } finally {
        transporter.close();
        job.done = true;
        scheduleCleanup(job.id);
    }
};
