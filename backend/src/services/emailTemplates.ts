import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { sanitizeEmailHtml } from './emailSignature.js';

export type EmailTemplateManageFailure = 'duplicate' | 'not_found';

export class EmailTemplateManageError extends Error {
    readonly reason: EmailTemplateManageFailure;

    constructor(reason: EmailTemplateManageFailure) {
        super(reason);

        this.name = 'EmailTemplateManageError';
        this.reason = reason;
    }
}

const emailTemplateSelect = {
    id: true,
    name: true,
    subject: true,
    body: true,
    active: true,
} as const;

export const listEmailTemplates = () =>
    prisma.emailTemplate.findMany({
        orderBy: { name: 'asc' },
        select: emailTemplateSelect,
    });

export const createEmailTemplate = async (
    actorId: string,
    name: string,
    subject: string,
    body: string,
) => {
    const exists = await prisma.emailTemplate.findUnique({ where: { name } });

    if (exists) {
        throw new EmailTemplateManageError('duplicate');
    }

    const template = await prisma.emailTemplate.create({
        data: { name, subject, body: sanitizeEmailHtml(body) },
        select: emailTemplateSelect,
    });

    await recordAudit({
        action: 'email_template_created',
        actorId,
        newValue: template.name.slice(0, 100),
    });

    return template;
};

export const updateEmailTemplate = async (
    actorId: string,
    id: string,
    input: { name: string; subject: string; body: string; active: boolean },
) => {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
        throw new EmailTemplateManageError('not_found');
    }

    if (input.name !== template.name) {
        const clash = await prisma.emailTemplate.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new EmailTemplateManageError('duplicate');
        }
    }

    const updated = await prisma.emailTemplate.update({
        where: { id },
        data: { ...input, body: sanitizeEmailHtml(input.body) },
        select: emailTemplateSelect,
    });

    await recordAudit({
        action: 'email_template_updated',
        actorId,
        oldValue: template.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteEmailTemplate = async (actorId: string, id: string) => {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
        throw new EmailTemplateManageError('not_found');
    }

    await prisma.emailTemplate.delete({ where: { id } });

    await recordAudit({
        action: 'email_template_deleted',
        actorId,
        oldValue: template.name.slice(0, 100),
    });
};
