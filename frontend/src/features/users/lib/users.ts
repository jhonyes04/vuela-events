import { api } from '@/lib/api';
import {
    type CategoryOption,
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

export const getUserCategoryPreferences = async (
    userId: string,
): Promise<CategoryOption[]> => {
    const { categories } = await api.get<{ categories: CategoryOption[] }>(
        `/users/${userId}/category-preferences`,
    );

    return categories;
};

export const setUserCategoryPreferences = async (
    userId: string,
    categoryIds: string[],
): Promise<CategoryOption[]> => {
    const { categories } = await api.patch<{ categories: CategoryOption[] }>(
        `/users/${userId}/category-preferences`,
        { categoryIds },
    );

    return categories;
};
