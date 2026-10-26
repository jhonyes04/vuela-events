import { prisma } from '../lib/prisma.js';

export interface OwnerCandidate {
    id: string;
    name: string;
    puntoVuela: string | null;
}

// Un admin puede fijar a cualquier activo (admin incluido); cualquier otro
// rol con permiso solo puede fijar a un activo que no sea admin.
export const listOwnerCandidates = (
    actorRoleId: string,
): Promise<OwnerCandidate[]> =>
    prisma.user.findMany({
        where: {
            active: true,
            ...(actorRoleId !== 'admin' && { roleId: { not: 'admin' } }),
        },
        select: { id: true, name: true, puntoVuela: true },
        orderBy: [{ puntoVuela: 'asc' }, { name: 'asc' }],
    });

export const ownerCandidateIsValid = async (
    id: string,
    actorRoleId: string,
): Promise<boolean> => {
    const count = await prisma.user.count({
        where: {
            id,
            active: true,
            ...(actorRoleId !== 'admin' && { roleId: { not: 'admin' } }),
        },
    });

    return count > 0;
};

export const isAdminUser = async (id: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: { roleId: true },
    });

    return user?.roleId === 'admin';
};
