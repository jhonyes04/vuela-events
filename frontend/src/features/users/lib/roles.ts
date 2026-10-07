import { api } from '@/lib/api';

// Ids de rol sembrados de fábrica, referenciados en varios puntos de la UI.
export const ROLE_IDS = {
    ADMIN: 'admin',
    DT: 'dt',
    AIL: 'ail',
} as const;

export interface Role {
    id: string;
    name: string;
    protected: boolean;
    permissions: { permissionId: string }[];
}

export const listRoles = async (): Promise<Role[]> => {
    const { roles } = await api.get<{ roles: Role[] }>('/roles');

    return roles;
};
