import { api } from '@/lib/api';

export interface Material {
    id: string;
    name: string;
    observations: string | null;
    active: boolean;
    createdById: string | null;
}

export interface MaterialInput {
    name: string;
    observations?: string | undefined;
}

export interface MaterialUpdateInput extends MaterialInput {
    active: boolean;
}

export const listMaterials = async (): Promise<Material[]> => {
    const { materials } = await api.get<{ materials: Material[] }>(
        '/materials',
    );

    return materials;
};

export const createMaterial = async (
    input: MaterialInput,
): Promise<Material> => {
    const { material } = await api.post<{ material: Material }>(
        '/materials',
        input,
    );

    return material;
};

export const updateMaterial = async (
    id: string,
    input: MaterialUpdateInput,
): Promise<Material> => {
    const { material } = await api.patch<{ material: Material }>(
        `/materials/${id}`,
        input,
    );

    return material;
};

export const deleteMaterial = async (id: string): Promise<void> =>
    api.delete(`/materials/${id}`);
