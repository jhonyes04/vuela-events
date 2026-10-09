import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import type { DinamizadorTitle } from '../lib/authUser.js';

const MANAGE_USERS = 'users:manage';
const MANAGE_ROLES = 'roles:manage';
const ADMIN_ROLE_ID = 'admin';

// Si se quitan de un rol, nadie más podría volver a concedérselos a sí mismo.
const CRITICAL_PERMISSIONS = [MANAGE_USERS, MANAGE_ROLES];

export type RoleChangeFailure =
    | 'forbidden'
    | 'not_found'
    | 'self_change'
    | 'last_manager'
    | 'has_events'
    | 'title_required';

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
    | 'last_manager'
    | 'invalid_permission';

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

export const deleteUser = async (actorId: string, targetId: string) => {
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

            const createdEvents = await tx.event.count({
                where: { createdById: targetId },
            });

            if (createdEvents > 0) {
                throw new RoleChangeError('has_events');
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

            await tx.auditLog.create({
                data: {
                    actorId,
                    targetId,
                    action: 'user_deleted',
                    oldValue: target.email,
                },
            });

            await tx.user.delete({ where: { id: targetId } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
};

export interface AdminProfileInput {
    name: string;
    lastName: string;
    puntoVuela: string;
    dinamizadorTitle: DinamizadorTitle | null;
}

export const adminUpdateUser = async (
    actorId: string,
    targetId: string,
    input: AdminProfileInput,
) => {
    if (actorId === targetId) {
        throw new RoleChangeError('self_change');
    }

    return prisma.$transaction(
        async (tx) => {
            await assertCanManageUsers(tx, actorId);

            const target = await tx.user.findUnique({
                where: { id: targetId },
                select: {
                    id: true,
                    name: true,
                    lastName: true,
                    puntoVuela: true,
                    dinamizadorTitle: true,
                    roleId: true,
                    role: {
                        select: {
                            permissions: { select: { permissionId: true } },
                        },
                    },
                },
            });

            if (!target) {
                throw new RoleChangeError('not_found');
            }

            const needsTitle =
                target.roleId !== 'admin' &&
                target.role.permissions.some(
                    (permission) => permission.permissionId === 'email:send',
                );

            const dinamizadorTitle = needsTitle ? input.dinamizadorTitle : null;

            if (needsTitle && dinamizadorTitle === null) {
                throw new RoleChangeError('title_required');
            }

            const changed = [
                target.name !== input.name ? 'name' : null,
                target.lastName !== input.lastName ? 'lastName' : null,
                target.puntoVuela !== input.puntoVuela ? 'puntoVuela' : null,
                target.dinamizadorTitle !== dinamizadorTitle
                    ? 'dinamizadorTitle'
                    : null,
            ].filter((field): field is string => field !== null);

            const updated = await tx.user.update({
                where: { id: targetId },
                data: {
                    name: input.name,
                    lastName: input.lastName,
                    puntoVuela: input.puntoVuela,
                    dinamizadorTitle,
                },
                select: {
                    id: true,
                    name: true,
                    lastName: true,
                    puntoVuela: true,
                    dinamizadorTitle: true,
                },
            });

            if (changed.length > 0) {
                await tx.auditLog.create({
                    data: {
                        actorId,
                        targetId,
                        action: 'user_profile_updated',
                        newValue: changed.join(','),
                    },
                });
            }

            return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
};

export const listRoles = () =>
    prisma.role.findMany({ orderBy: { id: 'asc' }, select: roleSelect });

export const listPermissions = () =>
    prisma.permission.findMany({ orderBy: { id: 'asc' } });

// Valida contra el catálogo real de la tabla Permission, no una lista
// hardcodeada: así un permiso nuevo no hace falta añadirlo en dos sitios.
const assertValidPermissionIds = async (
    permissionIds: string[],
): Promise<void> => {
    const unique = [...new Set(permissionIds)];

    if (unique.length === 0) return;

    const count = await prisma.permission.count({
        where: { id: { in: unique } },
    });

    if (count !== unique.length) {
        throw new RoleManageError('invalid_permission');
    }
};

export const createRole = async (
    actorId: string,
    id: string,
    name: string,
    permissionIds: string[],
) => {
    const exists = await prisma.role.findUnique({ where: { id } });

    if (exists) {
        throw new RoleManageError('duplicate');
    }

    await assertValidPermissionIds(permissionIds);

    return prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
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

        await tx.auditLog.create({
            data: {
                actorId,
                action: 'role_created',
                newValue: role.name.slice(0, 100),
            },
        });

        return role;
    });
};

export const setRolePermissions = async (
    actorId: string,
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

    await assertValidPermissionIds(permissionIds);

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
                others - (current.has(permissionId) ? activeWithThisRole : 0);

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

        await tx.auditLog.create({
            data: {
                actorId,
                action: 'role_permissions_changed',
                oldValue: `${current.size} permisos`,
                newValue: `${next.size} permisos`,
            },
        });

        return tx.role.findUniqueOrThrow({
            where: { id: roleId },
            select: roleSelect,
        });
    });
};

export const deleteRole = async (actorId: string, roleId: string) => {
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

    await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
            data: {
                actorId,
                action: 'role_deleted',
                oldValue: role.name.slice(0, 100),
            },
        });

        await tx.role.delete({ where: { id: roleId } });
    });
};
