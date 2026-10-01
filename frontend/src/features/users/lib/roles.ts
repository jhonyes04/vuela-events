import { api } from '@/lib/api';

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
