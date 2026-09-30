import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

const MANAGE_USERS = 'users:manage';
const MANAGE_ROLES = 'roles:manage';
const ADMIN_ROLE_ID = 'admin';

// Si se quitan de un rol, nadie más podría volver a concedérselos a sí mismo.
const CRITICAL_PERMISSIONS = [MANAGE_USERS, MANAGE_ROLES];

export type RoleChangeFailure =
    | 'forbidden'
    | 'not_found'
    | 'self_change'
    | 'last_manager';

export class RoleChangeError extends Error {
    readonly reason: RoleChangeFailure;

    constructor(reason: RoleChangeFailure) {
        super(reason);

        this.name = 'RoleChangeError';
        this.reason = reason;
    }
}

export type RoleManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'protected'
    | 'has_users'
    | 'last_manager';

export class RoleManageError extends Error {
    readonly reason: RoleManageFailure;

    constructor(reason: RoleManageFailure) {
        super(reason);

        this.name = 'RoleManageError';
        this.reason = reason;
    }
}

const userSelect = {
    id: true,
    email: true,
    name: true,
    roleId: true,
    active: true,
} as const;

const roleSelect = {
    id: true,
    name: true,
    protected: true,
    permissions: { select: { permissionId: true } },
} as const;

const hasPermission = async (
    tx: Prisma.TransactionClient,
    userId: string,
    permissionId: string,
): Promise<boolean> => {
    const count = await tx.user.count({
        where: {
            id: userId,
            active: true,
            role: { permissions: { some: { permissionId } } },
        },
    });

    return count > 0;
};

const countActiveWithPermission = (
    tx: Prisma.TransactionClient,
    permissionId: string,
): Promise<number> =>
    tx.user.count({
        where: {
            active: true,
            role: { permissions: { some: { permissionId } } },
        },
    });

const assertCanManageUsers = async (
    tx: Prisma.TransactionClient,
    actorId: string,
) => {
    if (!(await hasPermission(tx, actorId, MANAGE_USERS))) {
        throw new RoleChangeError('forbidden');
    }
};

export const changeUserRole = async (
    actorId: string,
    targetId: string,
    newRoleId: string,
) => {
    if (actorId === targetId) {
        throw new RoleChangeError('self_change');
    }

    return prisma.$transaction(
        async (tx) => {
            await assertCanManageUsers(tx, actorId);

            const target = await tx.user.findUnique({
                where: { id: targetId },
                select: userSelect,
            });

            if (!target) {
                throw new RoleChangeError('not_found');
            }

            const role = await tx.role.findUnique({ where: { id: newRoleId } });

            if (!role) {
                throw new RoleChangeError('not_found');
            }

            if (target.roleId === newRoleId) {
                return target;
            }

            if (
                target.active &&
                (await hasPermission(tx, target.id, MANAGE_USERS))
            ) {
                const managers = await countActiveWithPermission(
                    tx,
                    MANAGE_USERS,
                );

                if (managers <= 1) {
                    throw new RoleChangeError('last_manager');
                }
            }

            const updated = await tx.user.update({
                where: { id: targetId },
                data: { roleId: newRoleId },
                select: userSelect,
            });

            await tx.auditLog.create({
                data: {
                    actorId,
                    targetId,
                    action: 'role_change',
                    oldValue: target.roleId,
                    newValue: newRoleId,
                },
            });

            return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
};

export const setUserActive = async (
    actorId: string,
    targetId: string,
    active: boolean,
) => {
    if (actorId === targetId) {
        throw new RoleChangeError('self_change');
    }

    return prisma.$transaction(
        async (tx) => {
            await assertCanManageUsers(tx, actorId);

            const target = await tx.user.findUnique({
                where: { id: targetId },
                select: userSelect,
            });

            if (!target) {
                throw new RoleChangeError('not_found');
            }

            if (target.active === active) {
                return target;
            }

            if (!active && (await hasPermission(tx, target.id, MANAGE_USERS))) {
                const managers = await countActiveWithPermission(
                    tx,
                    MANAGE_USERS,
                );

                if (managers <= 1) {
                    throw new RoleChangeError('last_manager');
                }
            }

            const updated = await tx.user.update({
                where: { id: targetId },
                data: { active },
                select: userSelect,
            });

            if (!active) {
                // Corta de inmediato las sesiones abiertas del usuario.
                await tx.$executeRaw`DELETE FROM "session" WHERE "sess"->>'userId' = ${targetId}`;
            }

            await tx.auditLog.create({
                data: {
                    actorId,
                    targetId,
                    action: 'active_change',
                    oldValue: String(target.active),
                    newValue: String(active),
                },
            });

            return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
};

export const listRoles = () =>
    prisma.role.findMany({ orderBy: { id: 'asc' }, select: roleSelect });

export const listPermissions = () =>
    prisma.permission.findMany({ orderBy: { id: 'asc' } });

export const createRole = async (
    id: string,
    name: string,
    permissionIds: string[],
) => {
    const exists = await prisma.role.findUnique({ where: { id } });

    if (exists) {
        throw new RoleManageError('duplicate');
    }

    return prisma.role.create({
        data: {
            id,
            name,
            permissions: {
                create: permissionIds.map((permissionId) => ({
                    permissionId,
                })),
            },
        },
        select: roleSelect,
    });
};

export const setRolePermissions = async (
    roleId: string,
    permissionIds: string[],
) => {
    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { id: true, permissions: { select: { permissionId: true } } },
    });

    if (!role) {
        throw new RoleManageError('not_found');
    }

    // El admin siempre tiene todos los permisos: se ignora lo que se pida y
    // se guarda el catálogo completo (incluye los que se añadan más adelante).
    if (roleId === ADMIN_ROLE_ID) {
        const all = await prisma.permission.findMany({ select: { id: true } });

        permissionIds = all.map((p) => p.id);
    }

    const current = new Set(role.permissions.map((p) => p.permissionId));
    const next = new Set(permissionIds);

    return prisma.$transaction(async (tx) => {
        for (const permissionId of CRITICAL_PERMISSIONS) {
            const isBeingRemoved =
                current.has(permissionId) && !next.has(permissionId);

            if (!isBeingRemoved) continue;

            const activeWithThisRole = await tx.user.count({
                where: { roleId, active: true },
            });

            // Si nadie activo tiene este rol, quitarle el permiso no deja a
            // nadie tirado; solo hay que comprobar cuando sí lo tiene alguien.
            if (activeWithThisRole === 0) continue;

            const others = await countActiveWithPermission(tx, permissionId);
            const othersOutsideThisRole =
                others -
                (current.has(permissionId) ? activeWithThisRole : 0);

            if (othersOutsideThisRole <= 0) {
                throw new RoleManageError('last_manager');
            }
        }

        await tx.rolePermission.deleteMany({ where: { roleId } });

        if (permissionIds.length > 0) {
            await tx.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                })),
            });
        }

        return tx.role.findUniqueOrThrow({
            where: { id: roleId },
            select: roleSelect,
        });
    });
};

export const deleteRole = async (roleId: string) => {
    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
        throw new RoleManageError('not_found');
    }

    if (role.protected) {
        throw new RoleManageError('protected');
    }

    const usersWithRole = await prisma.user.count({ where: { roleId } });

    if (usersWithRole > 0) {
        throw new RoleManageError('has_users');
    }

    await prisma.role.delete({ where: { id: roleId } });
};
