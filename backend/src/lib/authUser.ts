import type { Role } from '../generated/prisma/client.js';

// Lo que la aplicación sabe de quien está autenticado. Nunca incluye googleSub.
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    // Punto Vuela del AIL o zona del DT; null hasta completar el perfil.
    puntoVuela: string | null;
    // false hasta que la persona completa su perfil en el primer acceso.
    profileCompleted: boolean;
    role: Role;
}

// Campos que se leen de la base de datos para construir un AuthUser.
export const authUserSelect = {
    id: true,
    email: true,
    name: true,
    puntoVuela: true,
    profileCompletedAt: true,
    role: true,
    active: true,
} as const;

export const toAuthUser = (row: {
    id: string;
    email: string;
    name: string;
    puntoVuela: string | null;
    profileCompletedAt: Date | null;
    role: Role;
}): AuthUser => ({
    id: row.id,
    email: row.email,
    name: row.name,
    puntoVuela: row.puntoVuela,
    profileCompleted: row.profileCompletedAt !== null,
    role: row.role,
});
