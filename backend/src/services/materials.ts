import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { canManageResource } from '../lib/ownership.js';
import type { AuthUser } from '../lib/authUser.js';

export type MaterialManageFailure = 'duplicate' | 'not_found' | 'forbidden';

export class MaterialManageError extends Error {
    readonly reason: MaterialManageFailure;

    constructor(reason: MaterialManageFailure) {
        super(reason);

        this.name = 'MaterialManageError';
        this.reason = reason;
    }
}

const materialSelect = {
    id: true,
    name: true,
    active: true,
    createdById: true,
} as const;

export const listMaterials = () =>
    prisma.material.findMany({
        orderBy: { name: 'asc' },
        select: materialSelect,
    });

export const createMaterial = async (actorId: string, name: string) => {
    const exists = await prisma.material.findUnique({ where: { name } });

    if (exists) {
        throw new MaterialManageError('duplicate');
    }

    const material = await prisma.material.create({
        data: { name, createdById: actorId },
        select: materialSelect,
    });

    await recordAudit({
        action: 'material_created',
        actorId,
        newValue: material.name.slice(0, 100),
    });

    return material;
};

export const updateMaterial = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
    input: { name: string; active: boolean },
) => {
    const material = await prisma.material.findUnique({ where: { id } });

    if (!material) {
        throw new MaterialManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            material.createdById,
            'materials:edit',
            'materials:edit:own',
        )
    ) {
        throw new MaterialManageError('forbidden');
    }

    if (input.name !== material.name) {
        const clash = await prisma.material.findUnique({
            where: { name: input.name },
        });

        if (clash) {
            throw new MaterialManageError('duplicate');
        }
    }

    const updated = await prisma.material.update({
        where: { id },
        data: input,
        select: materialSelect,
    });

    await recordAudit({
        action: 'material_updated',
        actorId: actor.id,
        oldValue: material.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return updated;
};

export const deleteMaterial = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
) => {
    const material = await prisma.material.findUnique({ where: { id } });

    if (!material) {
        throw new MaterialManageError('not_found');
    }

    if (
        !canManageResource(
            actor,
            material.createdById,
            'materials:delete',
            'materials:delete:own',
        )
    ) {
        throw new MaterialManageError('forbidden');
    }

    await prisma.material.delete({ where: { id } });

    await recordAudit({
        action: 'material_deleted',
        actorId: actor.id,
        oldValue: material.name.slice(0, 100),
    });
};
