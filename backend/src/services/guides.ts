import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { canManageResource } from '../lib/ownership.js';
import { isAdminUser, ownerCandidateIsValid } from './ownerCandidates.js';
import type { AuthUser } from '../lib/authUser.js';

export type GuideManageFealure =
    | 'duplicate'
    | 'not_found'
    | 'has_projects'
    | 'forbidden'
    | 'owner_not_found';

export class GuideManageError extends Error {
    readonly reason: GuideManageFealure;

    constructor(reason: GuideManageFealure) {
        super(reason);

        this.name = 'GuideManageError';
        this.reason = reason;
    }
}

const guideSelect = {
    id: true,
    name: true,
    url: true,
    active: true,
    createdById: true,
    createdBy: {
        select: { id: true, name: true, puntoVuela: true },
    },
    _count: { select: { projects: true } },
} as const;

const flattenGuide = <T extends { _count: { projects: number } }>({
    _count,
    ...rest
}: T) => ({ ...rest, inUse: _count.projects > 0 });

export const listGuides = async () => {
    const guides = await prisma.guide.findMany({
        orderBy: { name: 'asc' },
        select: guideSelect,
    });

    return guides.map(flattenGuide);
};

// Quien crea puede fijarse a sí mismo como propietario, o, si es admin, a
// otro usuario (dt o ail) en cuyo nombre está dando de alta la guía.
const resolveCreatedById = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    currentOwnerId: string | null,
    ownerId: string | null | undefined,
): Promise<string> => {
    if (!actor.permissions.includes('ownership:manage') || !ownerId) {
        return actor.id;
    }

    // Si ya es de un admin, quien no es admin no puede reasignarlo, ni
    // siquiera a sí mismo.
    if (
        actor.roleId !== 'admin' &&
        currentOwnerId &&
        (await isAdminUser(currentOwnerId))
    ) {
        throw new GuideManageError('owner_not_found');
    }

    if (!(await ownerCandidateIsValid(ownerId, actor.roleId))) {
        throw new GuideManageError('owner_not_found');
    }

    return ownerId;
};

export const createGuide = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    name: string,
    url: string,
    ownerId: string | null,
) => {
    const exists = await prisma.guide.findUnique({ where: { name } });

    if (exists) {
        throw new GuideManageError('duplicate');
    }

    const createdById = await resolveCreatedById(actor, null, ownerId);

    const guide = await prisma.guide.create({
        data: { name, url, createdById },
        select: guideSelect,
    });

    await recordAudit({
        action: 'guide_created',
        actorId: actor.id,
        newValue: guide.name.slice(0, 100),
    });

    return flattenGuide(guide);
};

export const updateGuide = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    id: string,
    input: {
        name: string;
        url: string;
        active: boolean;
        ownerId?: string | null;
    },
) => {
    const guide = await prisma.guide.findUnique({ where: { id } });

    if (!guide) {
        throw new GuideManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            guide.createdById,
            'guides:edit',
            'guides:edit:own',
        )
    ) {
        throw new GuideManageError('forbidden');
    }

    if (input.name !== guide.name) {
        const clash = await prisma.guide.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new GuideManageError('duplicate');
        }
    }

    const createdById =
        input.ownerId !== undefined
            ? await resolveCreatedById(actor, guide.createdById, input.ownerId)
            : undefined;

    const updated = await prisma.guide.update({
        where: { id },
        data: {
            name: input.name,
            url: input.url,
            active: input.active,
            ...(createdById && { createdById }),
        },
        select: guideSelect,
    });

    await recordAudit({
        action: 'guide_updated',
        actorId: actor.id,
        oldValue: guide.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return flattenGuide(updated);
};

export const deleteGuide = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
) => {
    const guide = await prisma.guide.findUnique({ where: { id } });

    if (!guide) {
        throw new GuideManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            guide.createdById,
            'guides:delete',
            'guides:delete:own',
        )
    ) {
        throw new GuideManageError('forbidden');
    }

    const projectsCount = await prisma.project.count({
        where: { guides: { some: { guideId: id } } },
    });

    if (projectsCount > 0) {
        throw new GuideManageError('has_projects');
    }

    await prisma.guide.delete({ where: { id } });

    await recordAudit({
        action: 'guide_deleted',
        actorId: actor.id,
        oldValue: guide.name.slice(0, 100),
    });
};
