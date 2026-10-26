import { api } from '@/lib/api';

export interface ProjectGuide {
    id: string;
    name: string;
    url: string;
}

export interface ProjectResourceLink {
    id: string;
    title: string;
    url: string;
}

export interface ProjectDocument {
    id: string;
    title: string;
}

export interface ProjectOwner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

export interface Project {
    id: string;
    name: string;
    openingInstructions: string | null;
    closingInstructions: string | null;
    color: string;
    active: boolean;
    createdById: string | null;
    createdBy: ProjectOwner | null;
    guides: ProjectGuide[];
    resourceLinks: ProjectResourceLink[];
    documents: ProjectDocument[];
}

export interface ProjectInput {
    name: string;
    openingInstructions: string | null;
    closingInstructions: string | null;
    color: string;
    guideIds: string[];
    resourceLinkIds: string[];
    documentIds: string[];
    ownerId?: string | undefined;
}

export interface ProjectUpdateInput extends ProjectInput {
    active: boolean;
}

export const listProjects = async (): Promise<Project[]> => {
    const { projects } = await api.get<{ projects: Project[] }>('/projects');

    return projects;
};

export const createProject = async (input: ProjectInput): Promise<Project> => {
    const { project } = await api.post<{ project: Project }>(
        '/projects',
        input,
    );

    return project;
};

export const updateProject = async (
    id: string,
    input: ProjectUpdateInput,
): Promise<Project> => {
    const { project } = await api.patch<{ project: Project }>(
        `/projects/${id}`,
        input,
    );

    return project;
};

export const deleteProject = (id: string): Promise<void> =>
    api.delete(`/projects/${id}`);

export interface ProjectInterestedUser {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export interface ProjectInterests {
    id: string;
    name: string;
    color: string;
    users: ProjectInterestedUser[];
}

export const listProjectInterests = async (): Promise<ProjectInterests[]> => {
    const { projects } = await api.get<{ projects: ProjectInterests[] }>(
        '/projects/interested-users',
    );

    return projects;
};

export interface EligibleUserOption {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export const listEligibleUsers = async (): Promise<EligibleUserOption[]> => {
    const { users } = await api.get<{ users: EligibleUserOption[] }>(
        '/projects/eligible-users',
    );

    return users;
};

export const addProjectInterestedUser = async (
    projectId: string,
    userId: string,
): Promise<ProjectInterests[]> => {
    const { projects } = await api.post<{
        projects: ProjectInterests[];
    }>(`/projects/${projectId}/interested-users`, { userId });

    return projects;
};

export const removeProjectInterestedUser = async (
    projectId: string,
    userId: string,
): Promise<ProjectInterests[]> => {
    const { projects } = await api.delete<{
        projects: ProjectInterests[];
    }>(`/projects/${projectId}/interested-users/${userId}`);

    return projects;
};
