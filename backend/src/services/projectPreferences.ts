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
    prisma.project.findMany({
        where: { active: true },
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' },
    });

export const getProjectPreferences = async (
    userId: string,
): Promise<ProjectOption[]> => {
    const rows = await prisma.userProjectPreference.findMany({
        where: { userId },
        select: { project: { select: { id: true, name: true, color: true } } },
        orderBy: { project: { name: 'asc' } },
    });

    return rows.map((r) => r.project);
};

export const setProjectPreferences = async (
    userId: string,
    projectIds: string[],
): Promise<ProjectOption[]> => {
    const unique = [...new Set(projectIds)];

    if (unique.length > 0) {
        const count = await prisma.project.count({
            where: { id: { in: unique } },
        });

        if (count !== unique.length) {
            throw new ProjectPreferenceError('invalid_project');
        }
    }

    await prisma.$transaction([
        prisma.userProjectPreference.deleteMany({ where: { userId } }),
        prisma.userProjectPreference.createMany({
            data: unique.map((projectId) => ({ userId, projectId })),
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
    const rows = await prisma.project.findMany({
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
    projectId: string,
): Promise<void> => {
    const userExists = await prisma.user.count({ where: { id: userId } });

    if (!userExists) {
        throw new ProjectPreferenceError('invalid_project');
    }

    const current = await getProjectPreferences(userId);
    const ids = new Set(current.map((c) => c.id));
    ids.add(projectId);

    await setProjectPreferences(userId, [...ids]);
};

export const removeProjectPreference = async (
    userId: string,
    projectId: string,
): Promise<void> => {
    const current = await getProjectPreferences(userId);
    const ids = current.map((c) => c.id).filter((id) => id !== projectId);

    await setProjectPreferences(userId, ids);
};
