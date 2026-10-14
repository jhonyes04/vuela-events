import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { canManageResource } from '../lib/ownership.js';
import type { AuthUser } from '../lib/authUser.js';

export type ResourceLinkManageFailure = 'duplicate' | 'not_found' | 'forbidden';

export class ResourceLinkManageError extends Error {
    readonly reason: ResourceLinkManageFailure;

    constructor(reason: ResourceLinkManageFailure) {
        super(reason);

        this.name = 'ResourceLinkManageError';
        this.reason = reason;
    }
}

const resourceLinkSelect = {
    id: true,
    title: true,
    url: true,
    active: true,
    createdById: true,
} as const;

export const listResourceLinks = () =>
    prisma.resourceLink.findMany({
        orderBy: { title: 'asc' },
        select: resourceLinkSelect,
    });

export const createResourceLink = async (
    actorId: string,
    title: string,
    url: string,
) => {
    const exists = await prisma.resourceLink.findUnique({ where: { title } });

    if (exists) {
        throw new ResourceLinkManageError('duplicate');
    }

    const link = await prisma.resourceLink.create({
        data: { title, url, createdById: actorId },
        select: resourceLinkSelect,
    });

    await recordAudit({
        action: 'resource_link_created',
        actorId,
        newValue: link.title.slice(0, 100),
    });

    return link;
};

export const updateResourceLink = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
    input: { title: string; url: string; active: boolean },
) => {
    const link = await prisma.resourceLink.findUnique({ where: { id } });

    if (!link) {
        throw new ResourceLinkManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            link.createdById,
            'resources:edit',
            'resources:edit:own',
        )
    ) {
        throw new ResourceLinkManageError('forbidden');
    }

    if (input.title !== link.title) {
        const clash = await prisma.resourceLink.findUnique({
            where: { title: input.title },
        });

        if (clash) {
            throw new ResourceLinkManageError('duplicate');
        }
    }

    const updated = await prisma.resourceLink.update({
        where: { id },
        data: input,
        select: resourceLinkSelect,
    });

    await recordAudit({
        action: 'resource_link_updated',
        actorId: actor.id,
        oldValue: link.title.slice(0, 100),
        newValue: updated.title.slice(0, 100),
    });

    return updated;
};

export const deleteResourceLink = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
) => {
    const link = await prisma.resourceLink.findUnique({ where: { id } });

    if (!link) {
        throw new ResourceLinkManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            link.createdById,
            'resources:delete',
            'resources:delete:own',
        )
    ) {
        throw new ResourceLinkManageError('forbidden');
    }

    await prisma.resourceLink.delete({ where: { id } });

    await recordAudit({
        action: 'resource_link_deleted',
        actorId: actor.id,
        oldValue: link.title.slice(0, 100),
    });
};
