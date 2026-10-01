import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { authUserSelect, toAuthUser, type AuthUser } from '../lib/authUser.js';

export interface ProfileInput {
    name: string;
    lastName: string;
    puntoVuela: string;
}

// Actualiza el perfil de la propia persona. El id sale siempre de la sesión.
// La primera vez fija profileCompletedAt; la auditoría guarda los NOMBRES de los
// campos cambiados, no sus valores (para no duplicar datos personales).
export const updateProfile = async (
    userId: string,
    input: ProfileInput,
): Promise<AuthUser> => {
    return prisma.$transaction(async (tx) => {
        const current = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: {
                name: true,
                lastName: true,
                puntoVuela: true,
                profileCompletedAt: true,
            },
        });

        const changed = [
            current.name !== input.name ? 'name' : null,
            current.lastName !== input.lastName ? 'lastName' : null,
            current.puntoVuela !== input.puntoVuela ? 'puntoVuela' : null,
        ].filter((field): field is string => field !== null);

        const firstTime = current.profileCompletedAt === null;

        const updated = await tx.user.update({
            where: { id: userId },
            data: {
                name: input.name,
                lastName: input.lastName,
                puntoVuela: input.puntoVuela,
                ...(firstTime && { profileCompletedAt: new Date() }),
            },
            select: authUserSelect,
        });

        if (firstTime || changed.length > 0) {
            await tx.auditLog.create({
                data: {
                    actorId: userId,
                    targetId: userId,
                    action: firstTime ? 'profile_completed' : 'profile_updated',
                    newValue: changed.join(',') || null,
                },
            });
        }

        return toAuthUser(updated);
    });
};

export const setAppPassword = async (
    userId: string,
    password: string,
): Promise<void> => {
    await prisma.user.update({
        where: { id: userId },
        data: { smtpAppPassword: encrypt(password) },
    });
};

export const clearAppPassword = async (userId: string): Promise<void> => {
    await prisma.user.update({
        where: { id: userId },
        data: { smtpAppPassword: null },
    });
};

// Nunca se envía al frontend sólo se usa en servidor para enviar correo
export const getDecryptedAppPassword = async (
    userId: string,
): Promise<string | null> => {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { smtpAppPassword: true },
    });

    return row?.smtpAppPassword ? decrypt(row.smtpAppPassword) : null;
};
