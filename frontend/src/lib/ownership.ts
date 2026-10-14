import type { User } from '@/lib/api';

// Mismo criterio que canManageResource en el backend:
// - Permiso "todos" manda
// - Si no, hace falta el permiso "propios" y ser quien lo creó
export const canManageResource = (
    user: Pick<User, 'id' | 'permissions'> | null,
    createdById: string | null,
    fullPermission: string,
    ownPermission: string,
): boolean => {
    if (!user) return false;

    return (
        user.permissions.includes(fullPermission) ||
        (user.permissions.includes(ownPermission) && createdById === user.id)
    );
};
