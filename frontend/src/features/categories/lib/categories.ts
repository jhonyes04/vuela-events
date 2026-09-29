import { api } from '@/lib/api';

export const CATEGORY_COLORS = [
    'yellow',
    'amber',
    'emerald',
    'sky',
    'rose',
    'violet',
    'slate',
    'orange',
    'pink',
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface Category {
    id: string;
    name: string;
    color: CategoryColor;
    active: boolean;
}

interface CategoryColorStyle {
    label: string;
    chip: string;
    swatch: string;
    // Borde superior de la tarjeta de evento (EventCard).
    border: string;
    // Fondo suave del header de la tarjeta; el texto se queda en su color normal.
    tint: string;
}

export const CATEGORY_COLOR_STYLES: Record<CategoryColor, CategoryColorStyle> =
    {
        yellow: {
            label: 'Amarillo',
            chip: 'bg-brand-yellow text-brand-ink',
            swatch: 'bg-brand-yellow',
            border: 'border-t-brand-yellow',
            tint: 'bg-brand-yellow/15',
        },
        amber: {
            label: 'Ámbar',
            chip: 'bg-amber-500 text-white',
            swatch: 'bg-amber-500',
            border: 'border-t-amber-500',
            tint: 'bg-amber-500/10',
        },
        emerald: {
            label: 'Esmeralda',
            chip: 'bg-emerald-500 text-white',
            swatch: 'bg-emerald-500',
            border: 'border-t-emerald-500',
            tint: 'bg-emerald-500/10',
        },
        sky: {
            label: 'Cielo',
            chip: 'bg-sky-500 text-white',
            swatch: 'bg-sky-500',
            border: 'border-t-sky-500',
            tint: 'bg-sky-500/10',
        },
        rose: {
            label: 'Rosa',
            chip: 'bg-rose-500 text-white',
            swatch: 'bg-rose-500',
            border: 'border-t-rose-500',
            tint: 'bg-rose-500/10',
        },
        violet: {
            label: 'Violeta',
            chip: 'bg-violet-500 text-white',
            swatch: 'bg-violet-500',
            border: 'border-t-violet-500',
            tint: 'bg-violet-500/10',
        },
        slate: {
            label: 'Pizarra',
            chip: 'bg-slate-500 text-white',
            swatch: 'bg-slate-500',
            border: 'border-t-slate-500',
            tint: 'bg-slate-500/10',
        },
        orange: {
            label: 'Naranja',
            chip: 'bg-orange-500 text-white',
            swatch: 'bg-orange-500',
            border: 'border-t-orange-500',
            tint: 'bg-orange-500/10',
        },
        pink: {
            label: 'Rosa fuerte',
            chip: 'bg-pink-500 text-white',
            swatch: 'bg-pink-500',
            border: 'border-t-pink-500',
            tint: 'bg-pink-500/10',
        },
    };

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
