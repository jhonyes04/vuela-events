import { prisma } from '../lib/prisma.js';

export type ProjectPreferenceFailure = 'invalid_project';

export class ProjectPreferenceError extends Error {
    readonly reason: ProjectPreferenceFailure;

    constructor(reason: ProjectPreferenceFailure) {
        super(reason);
        this.name = 'ProjectPreferenceError';
        this.reason = reason;
    }
}

export interface ProjectOption {
    id: string;
    name: string;
    color: string;
}

export const listProjectOptions = (): Promise<ProjectOption[]> =>
    prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' },
    });

export const getProjectPreferences = async (
    userId: string,
): Promise<ProjectOption[]> => {
    const rows = await prisma.userCategoryPreference.findMany({
        where: { userId },
        select: { category: { select: { id: true, name: true, color: true } } },
        orderBy: { category: { name: 'asc' } },
    });

    return rows.map((r) => r.category);
};

export const setProjectPreferences = async (
    userId: string,
    projectIds: string[],
): Promise<ProjectOption[]> => {
    const unique = [...new Set(projectIds)];

    if (unique.length > 0) {
        const count = await prisma.category.count({
            where: { id: { in: unique } },
        });

        if (count !== unique.length) {
            throw new ProjectPreferenceError('invalid_project');
        }
    }

    await prisma.$transaction([
        prisma.userCategoryPreference.deleteMany({ where: { userId } }),
        prisma.userCategoryPreference.createMany({
            data: unique.map((categoryId) => ({ userId, categoryId })),
        }),
    ]);

    return getProjectPreferences(userId);
};

export interface ProjectInterestedUser {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export interface ProjectWithInterestedUsers {
    id: string;
    name: string;
    color: string;
    users: ProjectInterestedUser[];
}

export const listProjectInterestedUsers = async (): Promise<
    ProjectWithInterestedUsers[]
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

    return rows.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        users: project.userPreferences.map((p) => p.user),
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

export const addProjectPreference = async (
    userId: string,
    categoryId: string,
): Promise<void> => {
    const userExists = await prisma.user.count({ where: { id: userId } });

    if (!userExists) {
        throw new ProjectPreferenceError('invalid_project');
    }

    const current = await getProjectPreferences(userId);
    const ids = new Set(current.map((c) => c.id));
    ids.add(categoryId);

    await setProjectPreferences(userId, [...ids]);
};

export const removeProjectPreference = async (
    userId: string,
    categoryId: string,
): Promise<void> => {
    const current = await getProjectPreferences(userId);
    const ids = current.map((c) => c.id).filter((id) => id !== categoryId);

    await setProjectPreferences(userId, ids);
};
