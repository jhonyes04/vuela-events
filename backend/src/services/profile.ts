import { prisma } from '../lib/prisma.js';
import { authUserSelect, toAuthUser, type AuthUser } from '../lib/authUser.js';

export interface ProfileInput {
    name: string;
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
            select: { name: true, puntoVuela: true, profileCompletedAt: true },
        });

        const changed = [
            current.name !== input.name ? 'name' : null,
            current.puntoVuela !== input.puntoVuela ? 'puntoVuela' : null,
        ].filter((field): field is string => field !== null);

        const firstTime = current.profileCompletedAt === null;

        const updated = await tx.user.update({
            where: { id: userId },
            data: {
                name: input.name,
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
