import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { canManageResource } from '../lib/ownership.js';
import { isAdminUser, ownerCandidateIsValid } from './ownerCandidates.js';
import type { AuthUser } from '../lib/authUser.js';

export type MaterialManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'forbidden'
    | 'in_use'
    | 'owner_not_found';

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
    observations: true,
    active: true,
    createdById: true,
    createdBy: {
        select: { id: true, name: true, puntoVuela: true },
    },
    _count: { select: { events: true } },
} as const;

const flattenMaterial = <T extends { _count: { events: number } }>({
    _count,
    ...rest
}: T) => ({ ...rest, inUse: _count.events > 0 });

export const listMaterials = async () => {
    const materials = await prisma.material.findMany({
        orderBy: { name: 'asc' },
        select: materialSelect,
    });

    return materials.map(flattenMaterial);
};

// Quien crea puede fijarse a sí mismo como propietario, o, si es admin, a
// otro usuario (dt o ail) en cuyo nombre está dando de alta el material.
const resolveCreatedById = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    currentOwnerId: string | null,
    ownerId: string | null | undefined,
): Promise<string> => {
    if (!actor.permissions.includes('ownership:manage') || !ownerId) {
        return actor.id;
    }

    // Si ya es de un admin, quien no es admin no puede reasignarlo, ni
    // siquiera a sí mismo.
    if (
        actor.roleId !== 'admin' &&
        currentOwnerId &&
        (await isAdminUser(currentOwnerId))
    ) {
        throw new MaterialManageError('owner_not_found');
    }

    if (!(await ownerCandidateIsValid(ownerId, actor.roleId))) {
        throw new MaterialManageError('owner_not_found');
    }

    return ownerId;
};

export const createMaterial = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    name: string,
    observations: string | null,
    ownerId: string | null,
) => {
    const exists = await prisma.material.findUnique({ where: { name } });

    if (exists) {
        throw new MaterialManageError('duplicate');
    }

    const createdById = await resolveCreatedById(actor, null, ownerId);

    const material = await prisma.material.create({
        data: { name, observations, createdById },
        select: materialSelect,
    });

    await recordAudit({
        action: 'material_created',
        actorId: actor.id,
        newValue: material.name.slice(0, 100),
    });

    return flattenMaterial(material);
};

export const updateMaterial = async (
    actor: Pick<AuthUser, 'id' | 'roleId' | 'permissions'>,
    id: string,
    input: {
        name: string;
        observations: string | null;
        active: boolean;
        ownerId?: string | null;
    },
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

    const createdById =
        input.ownerId !== undefined
            ? await resolveCreatedById(
                  actor,
                  material.createdById,
                  input.ownerId,
              )
            : undefined;

    const updated = await prisma.material.update({
        where: { id },
        data: {
            name: input.name,
            observations: input.observations,
            active: input.active,
            ...(createdById && { createdById }),
        },
        select: materialSelect,
    });

    await recordAudit({
        action: 'material_updated',
        actorId: actor.id,
        oldValue: material.name.slice(0, 100),
        newValue: updated.name.slice(0, 100),
    });

    return flattenMaterial(updated);
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

    const eventsCount = await prisma.eventMaterial.count({
        where: { materialId: id },
    });

    if (eventsCount > 0) {
        throw new MaterialManageError('in_use');
    }

    await prisma.material.delete({ where: { id } });

    await recordAudit({
        action: 'material_deleted',
        actorId: actor.id,
        oldValue: material.name.slice(0, 100),
    });
};
