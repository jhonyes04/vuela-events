import { api } from '@/lib/api';

export interface GuideOwner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

export interface Guide {
    id: string;
    name: string;
    url: string;
    active: boolean;
    inUse: boolean;
    createdById: string | null;
    createdBy: GuideOwner | null;
}

export interface GuideInput {
    name: string;
    url: string;
    ownerId?: string | undefined;
}

export interface GuideUpdateInput extends GuideInput {
    active: boolean;
}

export const listGuides = async (): Promise<Guide[]> => {
    const { guides } = await api.get<{ guides: Guide[] }>('/guides');

    return guides;
};

export const createGuide = async (input: GuideInput): Promise<Guide> => {
    const { guide } = await api.post<{ guide: Guide }>('/guides', input);

    return guide;
};

export const updateGuide = async (
    id: string,
    input: GuideUpdateInput,
): Promise<Guide> => {
    const { guide } = await api.patch<{ guide: Guide }>(`/guides/${id}`, input);

    return guide;
};

export const deleteGuide = async (id: string): Promise<void> =>
    api.delete(`/guides/${id}`);
