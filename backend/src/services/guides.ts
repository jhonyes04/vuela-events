import { prisma } from '../lib/prisma.js';

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

export const createGuide = async (name: string, url: string) => {
    const exists = await prisma.guide.findUnique({ where: { name } });

    if (exists) {
        throw new GuideManageError('duplicate');
    }

    return prisma.guide.create({
        data: { name, url },
        select: guideSelect,
    });
};

export const updateGuide = async (
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

    return prisma.guide.update({
        where: { id },
        data: input,
        select: guideSelect,
    });
};

export const deleteGuide = async (id: string) => {
    const guide = await prisma.guide.findUnique({ where: { id } });

    if (!guide) {
        throw new GuideManageError('not_found');
    }

    await prisma.guide.delete({ where: { id } });
};
