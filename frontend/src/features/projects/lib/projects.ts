import { api } from '@/lib/api';
import type { ProjectColor } from '@/features/projects/lib/colors';

export interface Project {
    id: string;
    name: string;
    color: ProjectColor;
    active: boolean;
}

export interface ProjectInput {
    name: string;
    color: ProjectColor;
}

export interface ProjectUpdateInput extends ProjectInput {
    active: boolean;
}

export const listProjects = async (): Promise<Project[]> => {
    const { projects } = await api.get<{ projects: Project[] }>(
        '/projects',
    );

    return projects;
};

export const createProject = async (
    input: ProjectInput,
): Promise<Project> => {
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
    color: ProjectColor;
    users: ProjectInterestedUser[];
}

export const listProjectInterests = async (): Promise<ProjectInterests[]> => {
    const { projects } = await api.get<{ projects: ProjectInterests[] }>(
        '/projects/interested-users',
    );

    return projects;
};

export interface AilUserOption {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export const listAilUsers = async (): Promise<AilUserOption[]> => {
    const { users } = await api.get<{ users: AilUserOption[] }>(
        '/projects/ail-users',
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
