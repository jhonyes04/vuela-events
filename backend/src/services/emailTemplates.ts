import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { sanitizeEmailHtml } from './emailSignature.js';
import type { AuthUser } from '../lib/authUser.js';

export type EmailTemplateCategory = 'dinamizacion' | 'administracion';

export type EmailTemplateManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'forbidden';

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
    category: true,
} as const;

type Actor = Pick<AuthUser, 'id' | 'roleId'>;

// Un dt solo ve/edita/borra las suyas (dinamizacion); admin ve y toca todas.
export const listEmailTemplates = (actor: Pick<Actor, 'roleId'>) =>
    prisma.emailTemplate.findMany({
        where:
            actor.roleId === 'admin' ? undefined : { category: 'dinamizacion' },
        orderBy: { name: 'asc' },
        select: emailTemplateSelect,
    });

export const createEmailTemplate = async (
    actor: Actor,
    name: string,
    subject: string,
    body: string,
    category?: EmailTemplateCategory,
) => {
    const exists = await prisma.emailTemplate.findUnique({ where: { name } });

    if (exists) {
        throw new EmailTemplateManageError('duplicate');
    }

    // dt: siempre dinamizacion, sin elección. admin: elige (si no manda
    // nada, administracion por defecto).
    const finalCategory: EmailTemplateCategory =
        actor.roleId === 'dt' ? 'dinamizacion' : (category ?? 'administracion');

    const template = await prisma.emailTemplate.create({
        data: {
            name,
            subject,
            body: sanitizeEmailHtml(body),
            category: finalCategory,
        },
        select: emailTemplateSelect,
    });

    await recordAudit({
        action: 'email_template_created',
        actorId: actor.id,
        newValue: template.name.slice(0, 100),
    });

    return template;
};

export const updateEmailTemplate = async (
    actor: Actor,
    id: string,
    input: {
        name: string;
        subject: string;
        body: string;
        active: boolean;
        category?: EmailTemplateCategory;
    },
) => {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
        throw new EmailTemplateManageError('not_found');
    }

    const isAdmin = actor.roleId === 'admin';

    if (!isAdmin && template.category !== 'dinamizacion') {
        throw new EmailTemplateManageError('forbidden');
    }

    if (input.category !== undefined && !isAdmin) {
        throw new EmailTemplateManageError('forbidden');
    }

    if (input.name !== template.name) {
        const clash = await prisma.emailTemplate.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new EmailTemplateManageError('duplicate');
        }
    }

    const { category, ...rest } = input;

    const updated = await prisma.emailTemplate.update({
        where: { id },
        data: {
            ...rest,
            body: sanitizeEmailHtml(input.body),
            ...(isAdmin && category !== undefined && { category }),
        },
        select: emailTemplateSelect,
    });

    await recordAudit({
        action: 'email_template_updated',
        actorId: actor.id,
        oldValue: template.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteEmailTemplate = async (actor: Actor, id: string) => {
    const template = await prisma.emailTemplate.findUnique({ where: { id } });

    if (!template) {
        throw new EmailTemplateManageError('not_found');
    }

    if (actor.roleId !== 'admin' && template.category !== 'dinamizacion') {
        throw new EmailTemplateManageError('forbidden');
    }

    await prisma.emailTemplate.delete({ where: { id } });

    await recordAudit({
        action: 'email_template_deleted',
        actorId: actor.id,
        oldValue: template.name.slice(0, 100),
    });
};
