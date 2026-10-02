import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';

export type GuideManageFealure = 'duplicate' | 'not_found';

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
} as const;

export const listGuides = () =>
    prisma.guide.findMany({
        orderBy: { name: 'asc' },
        select: guideSelect,
    });

export const createGuide = async (
    actorId: string,
    name: string,
    url: string,
) => {
    const exists = await prisma.guide.findUnique({ where: { name } });

    if (exists) {
        throw new GuideManageError('duplicate');
    }

    const guide = await prisma.guide.create({
        data: { name, url },
        select: guideSelect,
    });

    await recordAudit({
        action: 'guide_created',
        actorId,
        newValue: guide.name.slice(0, 100),
    });

    return guide;
};

export const updateGuide = async (
    actorId: string,
    id: string,
    input: { name: string; url: string; active: boolean },
) => {
    const guide = await prisma.guide.findUnique({ where: { id } });

    if (!guide) {
        throw new GuideManageError('not_found');
    }

    if (input.name !== guide.name) {
        const clash = await prisma.guide.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new GuideManageError('duplicate');
        }
    }

    const updated = await prisma.guide.update({
        where: { id },
        data: input,
        select: guideSelect,
    });

    await recordAudit({
        action: 'guide_updated',
        actorId,
        oldValue: guide.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteGuide = async (actorId: string, id: string) => {
    const guide = await prisma.guide.findUnique({ where: { id } });

    if (!guide) {
        throw new GuideManageError('not_found');
    }

    await prisma.guide.delete({ where: { id } });

    await recordAudit({
        action: 'guide_deleted',
        actorId,
        oldValue: guide.name.slice(0, 100),
    });
};
