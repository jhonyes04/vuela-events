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
    prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: projectSelect,
    });

export const createProject = async (
    actorId: string,
    name: string,
    color: ProjectColor,
) => {
    const exists = await prisma.project.findUnique({ where: { name } });

    if (exists) {
        throw new ProjectManageError('duplicate');
    }

    const project = await prisma.project.create({
        data: { name, color },
        select: projectSelect,
    });

    await recordAudit({
        action: 'project_created',
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
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    if (input.name !== project.name) {
        const clash = await prisma.project.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new ProjectManageError('duplicate');
        }
    }

    const updated = await prisma.project.update({
        where: { id },
        data: input,
        select: projectSelect,
    });

    await recordAudit({
        action: 'project_updated',
        actorId,
        oldValue: project.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteProject = async (actorId: string, id: string) => {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
        throw new ProjectManageError('not_found');
    }

    const eventsCount = await prisma.event.count({
        where: { projectId: id },
    });

    if (eventsCount > 0) {
        throw new ProjectManageError('has_events');
    }

    await prisma.project.delete({ where: { id } });

    await recordAudit({
        action: 'project_deleted',
        actorId,
        oldValue: project.name.slice(0, 100),
    });
};
