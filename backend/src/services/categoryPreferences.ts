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

export interface CategoryInterestedUser {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export interface CategoryWithInterestedUsers {
    id: string;
    name: string;
    color: string;
    users: CategoryInterestedUser[];
}

export const listCategoryInterestedUsers = async (): Promise<
    CategoryWithInterestedUsers[]
> => {
    const rows = await prisma.category.findMany({
        where: { active: true },
        select: {
            id: true,
            name: true,
            color: true,
            userPreferences: {
                where: { user: { roleId: 'ail', active: true } },
                select: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            lastName: true,
                            puntoVuela: true,
                        },
                    },
                },
                orderBy: { user: { name: 'asc' } },
            },
        },
        orderBy: { name: 'asc' },
    });

    return rows.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        users: category.userPreferences.map((p) => p.user),
    }));
};

export interface AilUserOption {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export const listAilUsers = (): Promise<AilUserOption[]> =>
    prisma.user.findMany({
        where: { active: true, roleId: 'ail' },
        select: { id: true, name: true, lastName: true, puntoVuela: true },
        orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
    });

export const addCategoryPreference = async (
    userId: string,
    categoryId: string,
): Promise<void> => {
    const userExists = await prisma.user.count({ where: { id: userId } });

    if (!userExists) {
        throw new CategoryPreferenceError('invalid_category');
    }

    const current = await getCategoryPreferences(userId);
    const ids = new Set(current.map((c) => c.id));
    ids.add(categoryId);

    await setCategoryPreferences(userId, [...ids]);
};

export const removeCategoryPreference = async (
    userId: string,
    categoryId: string,
): Promise<void> => {
    const current = await getCategoryPreferences(userId);
    const ids = current.map((c) => c.id).filter((id) => id !== categoryId);

    await setCategoryPreferences(userId, ids);
};
