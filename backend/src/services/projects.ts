import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { sanitizeEmailHtml } from './emailSignature.js';

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

export type ProjectManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'has_events'
    | 'guide_not_found';

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
    description: true,
    color: true,
    active: true,
    guide: { select: { id: true, name: true, url: true } },
} as const;

const guideExists = async (guideId: string): Promise<boolean> => {
    const guide = await prisma.guide.findUnique({
        where: { id: guideId },
        select: { id: true },
    });

    return guide !== null;
};

export const listProjects = () =>
    prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: projectSelect,
    });

export const createProject = async (
    actorId: string,
    name: string,
    description: string | null,
    color: ProjectColor,
    guideId: string,
) => {
    const exists = await prisma.project.findUnique({ where: { name } });

    if (exists) {
        throw new ProjectManageError('duplicate');
    }

    const project = await prisma.project.create({
        data: {
            name,
            description: description
                ? sanitizeEmailHtml(description) || null
                : null,
            color,
            guideId,
        },
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
    input: {
        name: string;
        description: string | null;
        color: ProjectColor;
        guideId: string;
        active: boolean;
    },
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

    if (!(await guideExists(input.guideId))) {
        throw new ProjectManageError('guide_not_found');
    }

    const updated = await prisma.project.update({
        where: { id },
        data: {
            ...input,
            description: input.description
                ? sanitizeEmailHtml(input.description) || null
                : null,
        },
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
