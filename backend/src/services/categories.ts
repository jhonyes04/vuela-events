import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';

export const CATEGORY_COLORS = [
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

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export type CategoryManageFailure = 'duplicate' | 'not_found' | 'has_events';

export class CategoryManageError extends Error {
    readonly reason: CategoryManageFailure;

    constructor(reason: CategoryManageFailure) {
        super(reason);

        this.name = 'CategoryManageError';
        this.reason = reason;
    }
}

const categorySelect = {
    id: true,
    name: true,
    color: true,
    active: true,
} as const;

export const listCategories = () =>
    prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: categorySelect,
    });

export const createCategory = async (
    actorId: string,
    name: string,
    color: CategoryColor,
) => {
    const exists = await prisma.category.findUnique({ where: { name } });

    if (exists) {
        throw new CategoryManageError('duplicate');
    }

    const category = await prisma.category.create({
        data: { name, color },
        select: categorySelect,
    });

    await recordAudit({
        action: 'category_created',
        actorId,
        newValue: category.name.slice(0, 100),
    });

    return category;
};

export const updateCategory = async (
    actorId: string,
    id: string,
    input: { name: string; color: CategoryColor; active: boolean },
) => {
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
        throw new CategoryManageError('not_found');
    }

    if (input.name !== category.name) {
        const clash = await prisma.category.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new CategoryManageError('duplicate');
        }
    }

    const updated = await prisma.category.update({
        where: { id },
        data: input,
        select: categorySelect,
    });

    await recordAudit({
        action: 'category_updated',
        actorId,
        oldValue: category.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteCategory = async (actorId: string, id: string) => {
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
        throw new CategoryManageError('not_found');
    }

    const eventsCount = await prisma.event.count({
        where: { categoryId: id },
    });

    if (eventsCount > 0) {
        throw new CategoryManageError('has_events');
    }

    await prisma.category.delete({ where: { id } });

    await recordAudit({
        action: 'category_deleted',
        actorId,
        oldValue: category.name.slice(0, 100),
    });
};
