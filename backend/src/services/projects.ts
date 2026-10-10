import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';

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

export type ProjectManageFailure = 'duplicate' | 'not_found' | 'has_events';

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
    color: true,
    active: true,
} as const;

export const listProjects = () =>
    prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: projectSelect,
    });

export const createProject = async (
    actorId: string,
    name: string,
    color: ProjectColor,
) => {
    const exists = await prisma.category.findUnique({ where: { name } });

    if (exists) {
        throw new ProjectManageError('duplicate');
    }

    const project = await prisma.category.create({
        data: { name, color },
        select: projectSelect,
    });

    await recordAudit({
        action: 'category_created',
        actorId,
        newValue: project.name.slice(0, 100),
    });

    return project;
};

export const updateProject = async (
    actorId: string,
    id: string,
    input: { name: string; color: ProjectColor; active: boolean },
) => {
    const project = await prisma.category.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    if (input.name !== project.name) {
        const clash = await prisma.category.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new ProjectManageError('duplicate');
        }
    }

    const updated = await prisma.category.update({
        where: { id },
        data: input,
        select: projectSelect,
    });

    await recordAudit({
        action: 'category_updated',
        actorId,
        oldValue: project.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteProject = async (actorId: string, id: string) => {
    const project = await prisma.category.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    const eventsCount = await prisma.event.count({
        where: { categoryId: id },
    });

    if (eventsCount > 0) {
        throw new ProjectManageError('has_events');
    }

    await prisma.category.delete({ where: { id } });

    await recordAudit({
        action: 'category_deleted',
        actorId,
        oldValue: project.name.slice(0, 100),
    });
};
