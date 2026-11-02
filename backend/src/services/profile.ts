import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import {
    authUserSelect,
    toAuthUser,
    type AuthUser,
    type DinamizadorTitle,
} from '../lib/authUser.js';
import { getActiveUserIds, notifyUsers } from './notification.js';

export interface ProfileInput {
    name: string;
    lastName: string;
    puntoVuela: string;
    dinamizadorTitle: DinamizadorTitle | null;
}

// Aviso best-effort al admin cuando alguien completa su perfil por primera
// vez (ahí es cuando se sabe su puntoVuela, no al crear la cuenta).
const notifyNewUserRegistered = async (user: AuthUser): Promise<void> => {
    const adminIds = await getActiveUserIds({
        roles: ['admin'],
        excludeUserId: user.id,
    });

    await notifyUsers(adminIds, {
        type: 'new_user_registered',
        title: 'Nuevo usuario registrado',
        body: user.puntoVuela
            ? `${user.puntoVuela} (${user.name})`
            : user.name,
    });
};

// Actualiza el perfil de la propia persona. El id sale siempre de la sesión.
// La primera vez fija profileCompletedAt; la auditoría guarda los NOMBRES de los
// campos cambiados, no sus valores (para no duplicar datos personales).
export const updateProfile = async (
    userId: string,
    input: ProfileInput,
): Promise<AuthUser> => {
    const { user, firstTime } = await prisma.$transaction(async (tx) => {
        const current = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: {
                name: true,
                lastName: true,
                puntoVuela: true,
                dinamizadorTitle: true,
                profileCompletedAt: true,
            },
        });

        const changed = [
            current.name !== input.name ? 'name' : null,
            current.lastName !== input.lastName ? 'lastName' : null,
            current.puntoVuela !== input.puntoVuela ? 'puntoVuela' : null,
            current.dinamizadorTitle !== input.dinamizadorTitle
                ? 'dinamizadorTitle'
                : null,
        ].filter((field): field is string => field !== null);

        const firstTime = current.profileCompletedAt === null;

        const updated = await tx.user.update({
            where: { id: userId },
            data: {
                name: input.name,
                lastName: input.lastName,
                puntoVuela: input.puntoVuela,
                dinamizadorTitle: input.dinamizadorTitle,
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

        return { user: toAuthUser(updated), firstTime };
    });

    if (firstTime) {
        void notifyNewUserRegistered(user);
    }

    return user;
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

export const setSignatureImage = async (
    userId: string,
    image: Buffer,
): Promise<void> => {
    await prisma.user.update({
        where: { id: userId },
        data: { signatureImage: new Uint8Array(image) },
    });
};

export const clearSignatureImage = async (userId: string): Promise<void> => {
    await prisma.user.update({
        where: { id: userId },
        data: { signatureImage: null },
    });
};

export const getSignatureImage = async (
    userId: string,
): Promise<Buffer | null> => {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { signatureImage: true },
    });

    return row?.signatureImage ? Buffer.from(row.signatureImage) : null;
};
