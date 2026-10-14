import type { AuthUser } from './authUser.js';

// true si el actor puede gestionar el recurso o tiene el permiso "todos" o tiene el permiso "propios" y además es quien lo creó.
export const canManageResource = (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    createdById: string | null,
    fullPermission: string,
    ownPermission: string,
): boolean =>
    actor.permissions.includes(fullPermission) ||
    (actor.permissions.includes(ownPermission) && createdById === actor.id);
