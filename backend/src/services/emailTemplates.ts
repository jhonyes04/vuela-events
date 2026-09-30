import { prisma } from '../lib/prisma.js';

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
    name: string,
    subject: string,
    body: string,
) => {
    const exists = await prisma.emailTemplate.findUnique({ where: { name } });

    if (exists) {
        throw new EmailTemplateManageError('duplicate');
    }

    return prisma.emailTemplate.create({
        data: { name, subject, body },
        select: emailTemplateSelect,
    });
};

export const updateEmailTemplate = async (
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

    return prisma.emailTemplate.update({
        where: { id },
        data: input,
        select: emailTemplateSelect,
    });
};

export const deleteEmailTemplate = async (id: string) => {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
        throw new EmailTemplateManageError('not_found');
    }

    await prisma.emailTemplate.delete({ where: { id } });
};
