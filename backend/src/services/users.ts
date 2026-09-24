import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { Prisma, type Role } from '../generated/prisma/client.js';
import type { GoogleIdentity } from '../lib/google.js';
import type { AuthUser } from '../middleware/auth.js';

export type LoginFailure = 'account_disabled' | 'email_conflict';

export class LoginFailureError extends Error {
    readonly reason: LoginFailure;

    constructor(reason: LoginFailure) {
        super(reason);

        this.name = 'LoginFailureError';
        this.reason = reason;
    }
}

const isUniqueViolation = (e: unknown): boolean => {
    return (
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
    );
};

const initialRoleFor = async (email: string): Promise<Role> => {
    if (!env.INITIAL_ADMIN_EMAIL || email !== env.INITIAL_ADMIN_EMAIL) {
        return 'ail';
    }

    const admins = await prisma.user.count({ where: { role: 'admin' } });

    return admins === 0 ? 'admin' : 'ail';
};

export const findOrCreateUser = async (
    identity: GoogleIdentity,
): Promise<AuthUser> => {
    const existing = await prisma.user.findUnique({
        where: { googleSub: identity.sub },
        select: { id: true, email: true, name: true, role: true, active: true },
    });

    if (existing) {
        if (!existing.active) {
            throw new LoginFailureError('account_disabled');
        }

        if (
            existing.email !== identity.email ||
            existing.name !== identity.name
        ) {
            try {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: { email: identity.email, name: identity.name },
                });
            } catch (e) {
                if (isUniqueViolation(e)) {
                    throw new LoginFailureError('email_conflict');
                }
                throw e;
            }
        }

        return {
            id: existing.id,
            email: identity.email,
            name: identity.name,
            role: existing.role,
        };
    }

    const emailToken = await prisma.user.findUnique({
        where: { email: identity.email },
        select: { id: true },
    });

    if (emailToken) {
        throw new LoginFailureError('email_conflict');
    }

    try {
        return await prisma.user.create({
            data: {
                email: identity.email,
                googleSub: identity.sub,
                name: identity.name,
                role: await initialRoleFor(identity.email),
            },
            select: { id: true, email: true, name: true, role: true },
        });
    } catch (e) {
        if (!isUniqueViolation(e)) {
            throw e;
        }

        // Otra petición simultánea acaba de crear a este mismo usuario
        // (p. ej. doble clic): se reutiliza en vez de fallar.
        const winner = await prisma.user.findUnique({
            where: { googleSub: identity.sub },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                active: true,
            },
        });

        if (!winner) {
            // El choque fue por el email, no por el googleSub: es otra cuenta.
            throw new LoginFailureError('email_conflict');
        }

        if (!winner.active) {
            throw new LoginFailureError('account_disabled');
        }

        return {
            id: winner.id,
            email: winner.email,
            name: winner.name,
            role: winner.role,
        };
    }
};
