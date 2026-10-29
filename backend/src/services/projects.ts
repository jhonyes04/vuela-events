import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { isAdminUser, ownerCandidateIsValid } from './ownerCandidates.js';
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
    | 'resource_link_not_found'
    | 'document_not_found'
    | 'forbidden'
    | 'owner_not_found';

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
    isMeeting: true,
    createdById: true,
    createdBy: {
        select: { id: true, name: true, puntoVuela: true },
    },
    guides: {
        select: { guide: { select: { id: true, name: true, url: true } } },
    },
    resourceLinks: {
        select: {
            resourceLink: { select: { id: true, title: true, url: true } },
        },
    },
    documents: {
        select: {
            document: { select: { id: true, title: true } },
        },
    },
} as const;

type RawProject = {
    guides: { guide: { id: string; name: string; url: string } }[];
    resourceLinks: {
        resourceLink: { id: string; title: string; url: string };
    }[];
    documents: { document: { id: string; title: string } }[];
    [key: string]: unknown;
};

const flattenProject = <T extends RawProject>({
    guides,
    resourceLinks,
    documents,
    ...rest
}: T) => ({
    ...rest,
    guides: guides.map((guide) => guide.guide),
    resourceLinks: resourceLinks.map((resource) => resource.resourceLink),
    documents: documents.map((document) => document.document),
});

const guidesExist = async (guideIds: string[]): Promise<boolean> => {
    const count = await prisma.guide.count({
        where: { id: { in: guideIds } },
    });

    return count === guideIds.length;
};

const resourceLinksExist = async (
    resourceLinkIds: string[],
): Promise<boolean> => {
    const count = await prisma.resourceLink.count({
        where: { id: { in: resourceLinkIds } },
    });

    return count === resourceLinkIds.length;
};

const documentsExist = async (documentIds: string[]): Promise<boolean> => {
    const count = await prisma.document.count({
        where: { id: { in: documentIds } },
    });

    return count === documentIds.length;
};

// Quien crea puede fijarse a sí mismo como propietario, o, si es admin, a
// otro usuario (dt o ail) en cuyo nombre está dando de alta el proyecto.
const resolveCreatedById = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    currentOwnerId: string | null,
    ownerId: string | null | undefined,
): Promise<string> => {
    if (!actor.permissions.includes('ownership:manage') || !ownerId)
        return actor.id;

    // Si ya es de un admin, quien no es admin no puede reasignarlo, ni
    // siquiera a sí mismo.
    if (
        actor.roleId !== 'admin' &&
        currentOwnerId &&
        (await isAdminUser(currentOwnerId))
    ) {
        throw new ProjectManageError('owner_not_found');
    }

    if (!(await ownerCandidateIsValid(ownerId, actor.roleId))) {
        throw new ProjectManageError('owner_not_found');
    }

    return ownerId;
};

export const listProjects = async () => {
    const projects = await prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: projectSelect,
    });

    return projects.map(flattenProject);
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
            where: {
                active: true,
                id: { not: excludeUserId },
                email: { not: { startsWith: 'demo-' } },
            },
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
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    name: string,
    openingInstructions: string | null,
    closingInstructions: string | null,
    color: string,
    guideIds: string[],
    resourceLinkIds: string[],
    documentIds: string[],
    ownerId: string | null,
    isMeeting: boolean | undefined,
) => {
    const exists = await prisma.project.findUnique({ where: { name } });

    if (exists) {
        throw new ProjectManageError('duplicate');
    }

    if (!(await guidesExist(guideIds))) {
        throw new ProjectManageError('guide_not_found');
    }

    if (!(await resourceLinksExist(resourceLinkIds))) {
        throw new ProjectManageError('resource_link_not_found');
    }

    if (!(await documentsExist(documentIds))) {
        throw new ProjectManageError('document_not_found');
    }

    const createdById = await resolveCreatedById(actor, null, ownerId);

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
            createdById,
            ...(actor.roleId === 'admin' &&
                isMeeting !== undefined && { isMeeting }),
            guides: { create: guideIds.map((guideId) => ({ guideId })) },
            resourceLinks: {
                create: resourceLinkIds.map((resourceLinkId) => ({
                    resourceLinkId,
                })),
            },
            documents: {
                create: documentIds.map((documentId) => ({ documentId })),
            },
        },
        select: projectSelect,
    });

    await recordAudit({
        action: 'project_created',
        actorId: actor.id,
        newValue: project.name.slice(0, 100),
    });

    void notifyProjectCreated(project, actor.id);

    return flattenProject(project);
};

export const updateProject = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    id: string,
    input: {
        name: string;
        openingInstructions: string | null;
        closingInstructions: string | null;
        color: string;
        guideIds: string[];
        resourceLinkIds: string[];
        documentIds: string[];
        active: boolean;
        ownerId?: string | null;
        isMeeting?: boolean;
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

    if (!(await resourceLinksExist(input.resourceLinkIds))) {
        throw new ProjectManageError('resource_link_not_found');
    }

    if (!(await documentsExist(input.documentIds))) {
        throw new ProjectManageError('document_not_found');
    }

    const createdById =
        input.ownerId !== undefined
            ? await resolveCreatedById(
                  actor,
                  project.createdById,
                  input.ownerId,
              )
            : undefined;

    const [, , , , , , updated] = await prisma.$transaction([
        prisma.projectGuide.deleteMany({ where: { projectId: id } }),
        prisma.projectGuide.createMany({
            data: input.guideIds.map((guideId) => ({
                projectId: id,
                guideId,
            })),
        }),
        prisma.projectResourceLink.deleteMany({ where: { projectId: id } }),
        prisma.projectResourceLink.createMany({
            data: input.resourceLinkIds.map((resourceLinkId) => ({
                projectId: id,
                resourceLinkId,
            })),
        }),
        prisma.projectDocument.deleteMany({ where: { projectId: id } }),
        prisma.projectDocument.createMany({
            data: input.documentIds.map((documentId) => ({
                projectId: id,
                documentId,
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
                ...(createdById && { createdById }),
                ...(actor.roleId === 'admin' &&
                    input.isMeeting !== undefined && {
                        isMeeting: input.isMeeting,
                    }),
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

    return flattenProject(updated);
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
