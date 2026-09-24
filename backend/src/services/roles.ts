import { prisma } from '../lib/prisma.js';
import { Prisma, type Role } from '../generated/prisma/client.js';

export type RoleChangeFailure =
    | 'forbidden'
    | 'not_found'
    | 'self_change'
    | 'last_admin';

export class RoleChangeError extends Error {
    readonly reason: RoleChangeFailure;

    constructor(reason: RoleChangeFailure) {
        super(reason);

        this.name = 'RoleChangeError';
        this.reason = reason;
    }
}

const userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    active: true,
} as const;

const assertActiveAdmin = async (
    tx: Prisma.TransactionClient,
    actorId: string,
) => {
    const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { role: true, active: true },
    });

    if (!actor || !actor.active || actor.role !== 'admin') {
        throw new RoleChangeError('forbidden');
    }
};

export const changeUserRole = async (
    actorId: string,
    targetId: string,
    newRole: Role,
) => {
    if (actorId === targetId) {
        throw new RoleChangeError('self_change');
    }

    return prisma.$transaction(
        async (tx) => {
            await assertActiveAdmin(tx, actorId);

            const target = await tx.user.findUnique({
                where: { id: targetId },
                select: userSelect,
            });

            if (!target) {
                throw new RoleChangeError('not_found');
            }

            if (target.role === newRole) {
                return target;
            }

            if (target.role === 'admin' && target.active) {
                const activeAdmins = await tx.user.count({
                    where: { role: 'admin', active: true },
                });

                if (activeAdmins <= 1) {
                    throw new RoleChangeError('last_admin');
                }
            }

            const updated = await tx.user.update({
                where: { id: targetId },
                data: { role: newRole },
                select: userSelect,
            });

            await tx.auditLog.create({
                data: {
                    actorId,
                    targetId,
                    action: 'role_change',
                    oldValue: target.role,
                    newValue: newRole,
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
            await assertActiveAdmin(tx, actorId);

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

            if (!active && target.role === 'admin') {
                const activeAdmins = await tx.user.count({
                    where: { role: 'admin', active: true },
                });

                if (activeAdmins <= 1) {
                    throw new RoleChangeError('last_admin');
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
