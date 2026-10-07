import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { renderEmail } from '../lib/emailTemplateRender.js';
import { getDecryptedAppPassword } from './profile.js';
import { deleteReportDraft, getReportDraft } from './reportDrafts.js';
import { saveSentReport } from './sentReports.js';
import { type SlotId } from './emailSending.js';
import {
    getEmailSignatureForSend,
    type SignatureInlineImage,
} from './emailSignature.js';

const BATCH_SIZE = 15;
const PAUSE_MS = 5_000;
// Límite defensivo por si algo evita la validación del frontend.
const MAX_RECIPIENTS = 500;
// Los jobs terminados se olvidan pasado este tiempo (evita crecer sin límite).
const JOB_TTL_MS = 10 * 60 * 1000;

export type StartSendFailure =
    | 'smtp_not_configured'
    | 'template_not_assigned'
    | 'event_not_found'
    | 'no_recipients'
    | 'too_many_recipients'
    | 'app_password_not_configured'
    | 'report_draft_required'
    | 'report_draft_not_found'
    | 'report_draft_mismatch';

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
    actorId: string;
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

// Solo el actor que inició el envío puede consultar su progreso.
export const getSendJob = (
    jobId: string,
    actorId: string,
): SendJob | undefined => {
    const job = jobs.get(jobId);

    return job?.actorId === actorId ? job : undefined;
};

interface StartSendInput {
    actorId: string;
    actorEmail: string;
    slot: SlotId;
    eventId: string;
    recipientRegistrationIds: string[];
    // Acta generada y revisada antes del envío (obligatoria en 'parte_firmas').
    reportDraftId?: string;
}

export const startBulkSend = async (
    input: StartSendInput,
): Promise<{ jobId: string }> => {
    if (input.recipientRegistrationIds.length === 0) {
        throw new StartSendError('no_recipients');
    }

    if (input.recipientRegistrationIds.length > MAX_RECIPIENTS) {
        throw new StartSendError('too_many_recipients');
    }

    const registrationIds = input.recipientRegistrationIds;

    // El parte de firmas adjunta exactamente el acta que la persona generó y
    // revisó antes de enviar, y solo si los destinatarios no han cambiado.
    let attachment: { filename: string; content: Buffer } | undefined;

    if (input.slot === 'parte_firmas') {
        if (!input.reportDraftId) {
            throw new StartSendError('report_draft_required');
        }

        const draft = getReportDraft(
            input.reportDraftId,
            input.actorId,
            input.eventId,
        );

        if (!draft) {
            throw new StartSendError('report_draft_not_found');
        }

        const selected = new Set(registrationIds);

        if (
            selected.size !== draft.registrationIds.length ||
            draft.registrationIds.some((id) => !selected.has(id))
        ) {
            throw new StartSendError('report_draft_mismatch');
        }

        attachment = { filename: draft.filename, content: draft.pdf };
    }

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
        select: { id: true, userId: true, user: { select: { email: true } } },
    });
    const recipients = registrations.map((r) => ({
        registrationId: r.id,
        userId: r.userId,
        email: r.user.email,
    }));

    const template = assignment.template;
    const { subject, body } = renderEmail(template, event);

    // Se resuelve antes de cualquier efecto: si falla, no se consume el borrador.
    const signature = await getEmailSignatureForSend(input.actorId);

    const sender = await prisma.user.findUnique({
        where: { id: input.actorId },
        select: { name: true, lastName: true },
    });
    const senderName = [sender?.name, sender?.lastName]
        .filter(Boolean)
        .join(' ');
    const html = signature ? `${body}<br><br>${signature.html}` : body;

    // Un borrador se usa una sola vez, y solo si ya no puede fallar nada antes del envío.
    if (attachment && input.reportDraftId) {
        deleteReportDraft(input.reportDraftId);
    }

    const jobId = randomUUID();
    const job: SendJob = {
        id: jobId,
        actorId: input.actorId,
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
        senderName,
        smtpPassword,
        subject,
        html,
        inlineImages: signature?.inlineImages ?? [],
        attachment,
        recipients,
        report: { eventId: input.eventId, senderId: input.actorId },
    });

    return { jobId };
};

const runSendJob = async (
    job: SendJob,
    ctx: {
        smtpConfig: { host: string; port: number; secure: boolean };
        actorEmail: string;
        senderName: string;
        smtpPassword: string;
        subject: string;
        html: string;
        inlineImages: SignatureInlineImage[];
        attachment?: { filename: string; content: Buffer };
        recipients: { registrationId: string; userId: string; email: string }[];
        // Si hay adjunto, se guarda una copia del acta enviada.
        report: { eventId: string; senderId: string };
    },
) => {
    const deliveredUserIds: string[] = [];

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
                        from: { name: ctx.senderName, address: ctx.actorEmail },
                        to: recipient.email,
                        subject: ctx.subject,
                        html: ctx.html,
                        attachments: [
                            ...(ctx.attachment ? [ctx.attachment] : []),
                            ...ctx.inlineImages,
                        ],
                    });

                    job.sent += 1;
                    deliveredUserIds.push(recipient.userId);
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

        // La copia solo se guarda si el correo llegó al menos a alguien.
        if (ctx.attachment && deliveredUserIds.length > 0) {
            try {
                await saveSentReport({
                    eventId: ctx.report.eventId,
                    senderId: ctx.report.senderId,
                    filename: ctx.attachment.filename,
                    pdf: ctx.attachment.content,
                    recipientUserIds: deliveredUserIds,
                });
            } catch (e) {
                // El envío ya salió: un fallo al archivar no debe romper el job.
                console.error('No se pudo guardar la copia del acta', e);
            }
        }

        job.done = true;
        scheduleCleanup(job.id);
    }
};
