import { api } from '@/lib/api';

export interface ResourceLink {
    id: string;
    title: string;
    url: string;
    active: boolean;
}

export interface ResourceLinkInput {
    title: string;
    url: string;
}

export interface ResourceLinkUpdateInput extends ResourceLinkInput {
    active: boolean;
}

export const listResourceLinks = async (): Promise<ResourceLink[]> => {
    const { links } = await api.get<{ links: ResourceLink[] }>(
        '/resource-links',
    );

    return links;
};

export const createResourceLink = async (
    input: ResourceLinkInput,
): Promise<ResourceLink> => {
    const { link } = await api.post<{ link: ResourceLink }>(
        '/resource-links',
        input,
    );

    return link;
};

export const updateResourceLink = async (
    id: string,
    input: ResourceLinkUpdateInput,
): Promise<ResourceLink> => {
    const { link } = await api.patch<{ link: ResourceLink }>(
        `/resource-links/${id}`,
        input,
    );

    return link;
};

export const deleteResourceLink = async (id: string): Promise<void> =>
    api.delete(`/resource-links/${id}`);
