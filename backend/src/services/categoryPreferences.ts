import { prisma } from '../lib/prisma.js';

export type CategoryPreferenceFailure = 'invalid_category';

export class CategoryPreferenceError extends Error {
    readonly reason: CategoryPreferenceFailure;

    constructor(reason: CategoryPreferenceFailure) {
        super(reason);
        this.name = 'CategoryPreferenceError';
        this.reason = reason;
    }
}

export interface CategoryOption {
    id: string;
    name: string;
    color: string;
}

export const listCategoryOptions = (): Promise<CategoryOption[]> =>
    prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' },
    });

export const getCategoryPreferences = async (
    userId: string,
): Promise<CategoryOption[]> => {
    const rows = await prisma.userCategoryPreference.findMany({
        where: { userId },
        select: { category: { select: { id: true, name: true, color: true } } },
        orderBy: { category: { name: 'asc' } },
    });

    return rows.map((r) => r.category);
};

export const setCategoryPreferences = async (
    userId: string,
    categoryIds: string[],
): Promise<CategoryOption[]> => {
    const unique = [...new Set(categoryIds)];

    if (unique.length > 0) {
        const count = await prisma.category.count({
            where: { id: { in: unique } },
        });

        if (count !== unique.length) {
            throw new CategoryPreferenceError('invalid_category');
        }
    }

    await prisma.$transaction([
        prisma.userCategoryPreference.deleteMany({ where: { userId } }),
        prisma.userCategoryPreference.createMany({
            data: unique.map((categoryId) => ({ userId, categoryId })),
        }),
    ]);

    return getCategoryPreferences(userId);
};
