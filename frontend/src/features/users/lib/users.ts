import { api } from '@/lib/api';
import {
    type ProjectOption,
    type DinamizadorTitle,
} from '@/features/profile/lib/profile';

export interface AdminUserProfileValues {
    name: string;
    lastName: string;
    puntoVuela: string;
    dinamizadorTitle: DinamizadorTitle | null;
}

export interface UpdateUserProfile {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string;
    dinamizadorTitle: DinamizadorTitle | null;
}

export const updateUserProfile = async (
    userId: string,
    values: AdminUserProfileValues,
): Promise<UpdateUserProfile> => {
    const { user } = await api.patch<{ user: UpdateUserProfile }>(
        `/users/${userId}/profile`,
        values,
    );

    return user;
};

export const getUserProjectPreferences = async (
    userId: string,
): Promise<ProjectOption[]> => {
    const { projects } = await api.get<{ projects: ProjectOption[] }>(
        `/users/${userId}/project-preferences`,
    );

    return projects;
};

export const setUserProjectPreferences = async (
    userId: string,
    projectIds: string[],
): Promise<ProjectOption[]> => {
    const { projects } = await api.patch<{ projects: ProjectOption[] }>(
        `/users/${userId}/project-preferences`,
        { projectIds },
    );

    return projects;
};
