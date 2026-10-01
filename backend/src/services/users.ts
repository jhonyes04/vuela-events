import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { authUserSelect, toAuthUser, type AuthUser } from '../lib/authUser.js';
import type { GoogleIdentity } from '../lib/google.js';

const MAX_AVATAR_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

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

// Si ya tiene avatar, no hace nada (solo se descarga una vez). Si Google
// falla o el fichero no es válido, no bloquea el login: simplemente no
// queda avatar guardado y se reintentará en el siguiente login.
const downloadAvatarIfMissing = async (
    userId: string,
    pictureUrl: string,
): Promise<void> => {
    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarImage: true },
    });

    if (current?.avatarImage) return;

    try {
        const res = await fetch(pictureUrl, {
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) return;

        const contentType = res.headers.get('content-type') ?? '';

        if (!ALLOWED_AVATAR_TYPES.has(contentType)) return;

        const buffer = Buffer.from(await res.arrayBuffer());

        if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) return;

        await prisma.user.update({
            where: { id: userId },
            data: {
                avatarImage: new Uint8Array(buffer),
                avatarImageType: contentType,
            },
        });
    } catch {
        // Descarga best-effort: ver comentario de la función.
    }
};

// Tras construir el AuthUser, si Google trae foto y todavía no hay una
// guardada, la descarga y devuelve el AuthUser ya actualizado.
const finishLogin = async (
    user: AuthUser,
    picture: string | undefined,
): Promise<AuthUser> => {
    if (!picture || user.avatarConfigured) return user;

    await downloadAvatarIfMissing(user.id, picture);

    const refreshed = await prisma.user.findUnique({
        where: { id: user.id },
        select: authUserSelect,
    });

    return refreshed ? toAuthUser(refreshed) : user;
};

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

        return finishLogin(
            toAuthUser({
                ...existing,
                email: identity.email,
                name,
                lastName,
            }),
            identity.picture,
        );
    }

    const emailToken = await prisma.user.findUnique({
        where: { email: identity.email },
        select: { id: true },
    });

    if (emailToken) {
        throw new LoginFailureError('email_conflict');
    }

    try {
        return finishLogin(
            toAuthUser(
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
            ),
            identity.picture,
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

        return finishLogin(toAuthUser(winner), identity.picture);
    }
};
