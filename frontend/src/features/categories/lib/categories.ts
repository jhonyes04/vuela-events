import { api } from '@/lib/api';
import type { CategoryColor } from '@/features/categories/lib/colors';

export interface Category {
    id: string;
    name: string;
    color: CategoryColor;
    active: boolean;
}

export interface CategoryInput {
    name: string;
    color: CategoryColor;
}

export interface CategoryUpdateInput extends CategoryInput {
    active: boolean;
}

export const listCategories = async (): Promise<Category[]> => {
    const { categories } = await api.get<{ categories: Category[] }>(
        '/categories',
    );

    return categories;
};

export const createCategory = async (
    input: CategoryInput,
): Promise<Category> => {
    const { category } = await api.post<{ category: Category }>(
        '/categories',
        input,
    );

    return category;
};

export const updateCategory = async (
    id: string,
    input: CategoryUpdateInput,
): Promise<Category> => {
    const { category } = await api.patch<{ category: Category }>(
        `/categories/${id}`,
        input,
    );

    return category;
};

export const deleteCategory = (id: string): Promise<void> =>
    api.delete(`/categories/${id}`);

export interface CategoryInterestedUser {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export interface CategoryInterests {
    id: string;
    name: string;
    color: CategoryColor;
    users: CategoryInterestedUser[];
}

export const listCategoryInterests = async (): Promise<CategoryInterests[]> => {
    const { categories } = await api.get<{ categories: CategoryInterests[] }>(
        '/categories/interested-users',
    );

    return categories;
};

export interface AilUserOption {
    id: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
}

export const listAilUsers = async (): Promise<AilUserOption[]> => {
    const { users } = await api.get<{ users: AilUserOption[] }>(
        '/categories/ail-users',
    );

    return users;
};

export const addCategoryInterestedUser = async (
    categoryId: string,
    userId: string,
): Promise<CategoryInterests[]> => {
    const { categories } = await api.post<{
        categories: CategoryInterests[];
    }>(`/categories/${categoryId}/interested-users`, { userId });

    return categories;
};

export const removeCategoryInterestedUser = async (
    categoryId: string,
    userId: string,
): Promise<CategoryInterests[]> => {
    const { categories } = await api.delete<{
        categories: CategoryInterests[];
    }>(`/categories/${categoryId}/interested-users/${userId}`);

    return categories;
};
