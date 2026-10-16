import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { sanitizeEmailHtml } from './emailSignature.js';
import { canManageResource } from '../lib/ownership.js';
import { logger } from '../lib/logger.js';
import { renderNotificationEmail } from '../lib/emailTemplateRender.js';
import { sendNoReplyEmail } from './noReplyEmail.js';
import { env } from '../config/env.js';
import type { AuthUser } from '../lib/authUser.js';

export const PROJECT_COLORS = [
    'yellow',
    'amber',
    'emerald',
    'sky',
    'rose',
    'violet',
    // 'slate',
    'orange',
    'pink',
    // 'gray',
    // 'zinc',
    // 'neutral',
    // 'stone',
    'lime',
    // 'green',
    // 'teal',
    // 'cyan',
    // 'blue',
    // 'indigo',
    // 'purple',
    'fuchsia',
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

export type ProjectManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'has_events'
    | 'guide_not_found'
    | 'forbidden';

export class ProjectManageError extends Error {
    readonly reason: ProjectManageFailure;

    constructor(reason: ProjectManageFailure) {
        super(reason);

        this.name = 'ProjectManageError';
        this.reason = reason;
    }
}

const projectSelect = {
    id: true,
    name: true,
    openingInstructions: true,
    closingInstructions: true,
    color: true,
    active: true,
    createdById: true,
    guides: {
        select: { guide: { select: { id: true, name: true, url: true } } },
    },
} as const;

type RawProject = {
    guides: { guide: { id: string; name: string; url: string } }[];
    [key: string]: unknown;
};

const flattenGuides = <T extends RawProject>({ guides, ...rest }: T) => ({
    ...rest,
    guides: guides.map((g) => g.guide),
});

const guidesExist = async (guideIds: string[]): Promise<boolean> => {
    const count = await prisma.guide.count({
        where: { id: { in: guideIds } },
    });

    return count === guideIds.length;
};

export const listProjects = async () => {
    const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: projectSelect,
    });

    return projects.map(flattenGuides);
};

// En segundo plano: no bloquea la respuesta de crear el proyecto (puede ser
// a cientos de usuarios). Best-effort, igual criterio que notifyRegistrationChange.
const notifyProjectCreated = async (
    project: { name: string },
    excludeUserId: string,
) => {
    try {
        const assignment = await prisma.emailTemplateAssignment.findUnique({
            where: { slot: 'proyecto_nuevo' },
            select: { template: true },
        });

        if (!assignment?.template) return;

        const users = await prisma.user.findMany({
            where: { active: true, id: { not: excludeUserId } },
            select: { email: true },
        });

        if (users.length === 0) return;

        const { subject, body } = renderNotificationEmail(assignment.template, {
            proyecto: project.name,
            enlacePerfil: `${env.FRONTEND_ORIGIN}/perfil`,
        });

        await sendNoReplyEmail({
            to: users.map((user) => user.email),
            subject,
            html: body,
        });
    } catch (e) {
        logger.error(
            { err: e },
            'No se pudo enviar el aviso de proyecto_nuevo',
        );
    }
};

export const createProject = async (
    actorId: string,
    name: string,
    openingInstructions: string | null,
    closingInstructions: string | null,
    color: ProjectColor,
    guideIds: string[],
) => {
    const exists = await prisma.project.findUnique({ where: { name } });

    if (exists) {
        throw new ProjectManageError('duplicate');
    }

    if (!(await guidesExist(guideIds))) {
        throw new ProjectManageError('guide_not_found');
    }

    const project = await prisma.project.create({
        data: {
            name,
            openingInstructions: openingInstructions
                ? sanitizeEmailHtml(openingInstructions) || null
                : null,
            closingInstructions: closingInstructions
                ? sanitizeEmailHtml(closingInstructions) || null
                : null,
            color,
            createdById: actorId,
            guides: { create: guideIds.map((guideId) => ({ guideId })) },
        },
        select: projectSelect,
    });

    await recordAudit({
        action: 'project_created',
        actorId,
        newValue: project.name.slice(0, 100),
    });

    void notifyProjectCreated(project, actorId);

    return flattenGuides(project);
};

export const updateProject = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
    input: {
        name: string;
        openingInstructions: string | null;
        closingInstructions: string | null;
        color: ProjectColor;
        guideIds: string[];
        active: boolean;
    },
) => {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            project.createdById,
            'projects:edit',
            'projects:edit:own',
        )
    ) {
        throw new ProjectManageError('forbidden');
    }

    if (input.name !== project.name) {
        const clash = await prisma.project.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new ProjectManageError('duplicate');
        }
    }

    if (!(await guidesExist(input.guideIds))) {
        throw new ProjectManageError('guide_not_found');
    }

    const [, , updated] = await prisma.$transaction([
        prisma.projectGuide.deleteMany({ where: { projectId: id } }),
        prisma.projectGuide.createMany({
            data: input.guideIds.map((guideId) => ({
                projectId: id,
                guideId,
            })),
        }),
        prisma.project.update({
            where: { id },
            data: {
                name: input.name,
                openingInstructions: input.openingInstructions
                    ? sanitizeEmailHtml(input.openingInstructions) || null
                    : null,
                closingInstructions: input.closingInstructions
                    ? sanitizeEmailHtml(input.closingInstructions) || null
                    : null,
                color: input.color,
                active: input.active,
            },
            select: projectSelect,
        }),
    ]);

    await recordAudit({
        action: 'project_updated',
        actorId: actor.id,
        oldValue: project.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return flattenGuides(updated);
};

export const deleteProject = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
) => {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            project.createdById,
            'projects:delete',
            'projects:delete:own',
        )
    ) {
        throw new ProjectManageError('forbidden');
    }

    const eventsCount = await prisma.event.count({
        where: { projectId: id },
    });

    if (eventsCount > 0) {
        throw new ProjectManageError('has_events');
    }

    await prisma.project.delete({ where: { id } });

    await recordAudit({
        action: 'project_deleted',
        actorId: actor.id,
        oldValue: project.name.slice(0, 100),
    });
};
