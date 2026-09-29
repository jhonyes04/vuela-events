import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { authUserSelect, toAuthUser, type AuthUser } from '../lib/authUser.js';
import type { GoogleIdentity } from '../lib/google.js';

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

const initialRoleFor = (email: string): string =>
    env.SUPERADMIN_EMAIL && email === env.SUPERADMIN_EMAIL ? 'admin' : 'ail';

export const findOrCreateUser = async (
    identity: GoogleIdentity,
): Promise<AuthUser> => {
    const existing = await prisma.user.findUnique({
        where: { googleSub: identity.sub },
        select: authUserSelect,
    });

    if (existing) {
        if (!existing.active) {
            throw new LoginFailureError('account_disabled');
        }

        // El nombre se toma de Google solo hasta que la persona completa su
        // perfil; después manda el que ella escribió y no se sobrescribe.
        const name =
            existing.profileCompletedAt === null
                ? identity.name
                : existing.name;

        const lastName =
            existing.profileCompletedAt === null
                ? identity.lastName
                : existing.lastName;

        if (
            existing.email !== identity.email ||
            existing.name !== name ||
            existing.lastName !== lastName
        ) {
            try {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: { email: identity.email, name, lastName },
                });
            } catch (e) {
                if (isUniqueViolation(e)) {
                    throw new LoginFailureError('email_conflict');
                }
                throw e;
            }
        }

        return toAuthUser({
            ...existing,
            email: identity.email,
            name,
            lastName,
        });
    }

    const emailToken = await prisma.user.findUnique({
        where: { email: identity.email },
        select: { id: true },
    });

    if (emailToken) {
        throw new LoginFailureError('email_conflict');
    }

    try {
        return toAuthUser(
            await prisma.user.create({
                data: {
                    email: identity.email,
                    googleSub: identity.sub,
                    name: identity.name,
                    lastName: identity.lastName,
                    roleId: initialRoleFor(identity.email),
                },
                select: authUserSelect,
            }),
        );
    } catch (e) {
        if (!isUniqueViolation(e)) {
            throw e;
        }

        // Otra petición simultánea acaba de crear a este mismo usuario
        // (p. ej. doble clic): se reutiliza en vez de fallar.
        const winner = await prisma.user.findUnique({
            where: { googleSub: identity.sub },
            select: authUserSelect,
        });

        if (!winner) {
            // El choque fue por el email, no por el googleSub: es otra cuenta.
            throw new LoginFailureError('email_conflict');
        }

        if (!winner.active) {
            throw new LoginFailureError('account_disabled');
        }

        return toAuthUser(winner);
    }
};
