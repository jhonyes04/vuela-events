// Lo que la aplicación sabe de quien está autenticado. Nunca incluye googleSub ni los datos cifrados/binarios en sí (contraseña de aplicación, firma, avatar), solo si están configurados.
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    profileCompleted: boolean;
    roleId: string;
    roleName: string;
    permissions: string[];
    smtpAppPasswordConfigured: boolean;
    signatureConfigured: boolean;
    avatarConfigured: boolean;
}

// Campos que se leen de la base de datos para construir un AuthUser.
export const authUserSelect = {
    id: true,
    email: true,
    name: true,
    lastName: true,
    puntoVuela: true,
    profileCompletedAt: true,
    active: true,
    smtpAppPassword: true,
    signatureImage: true,
    avatarImage: true,
    role: {
        select: {
            id: true,
            name: true,
            permissions: { select: { permissionId: true } },
        },
    },
} as const;

export const toAuthUser = (row: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    profileCompletedAt: Date | null;
    smtpAppPassword: string | null;
    signatureImage: unknown | null;
    avatarImage: unknown | null;
    role: { id: string; name: string; permissions: { permissionId: string }[] };
}): AuthUser => ({
    id: row.id,
    email: row.email,
    name: row.name,
    lastName: row.lastName,
    puntoVuela: row.puntoVuela,
    profileCompleted: row.profileCompletedAt !== null,
    roleId: row.role.id,
    roleName: row.role.name,
    permissions: row.role.permissions.map(
        (permission) => permission.permissionId,
    ),
    smtpAppPasswordConfigured: row.smtpAppPassword !== null,
    signatureConfigured: row.signatureImage !== null,
    avatarConfigured: row.avatarImage !== null,
});
