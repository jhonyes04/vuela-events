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
