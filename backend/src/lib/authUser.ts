export const DINAMIZADOR_TITLES = ['dinamizador', 'dinamizadora'] as const;

export type DinamizadorTitle = (typeof DINAMIZADOR_TITLES)[number];

export const isDinamizadorTitle = (
    value: string | null,
): value is DinamizadorTitle =>
    value !== null && (DINAMIZADOR_TITLES as readonly string[]).includes(value);

// Lo que la aplicación sabe de quien está autenticado. Nunca incluye googleSub ni los datos cifrados/binarios en sí (contraseña de aplicación, firma, avatar), solo si están configurados.
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    dinamizadorTitle: DinamizadorTitle | null;
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
    dinamizadorTitle: true,
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
    dinamizadorTitle: string | null;
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
    dinamizadorTitle: isDinamizadorTitle(row.dinamizadorTitle)
        ? row.dinamizadorTitle
        : null,
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
