import {
    PROJECT_HEX,
    isCustomProjectColor,
    type ProjectColor,
} from '@/features/projects/lib/colors';

// Los proyectos llevan su color (paleta fija o hex libre); los grupos sin
// color (guías) usan el de la gráfica.
export const groupFill = (color: string | null): string => {
    if (!color) return 'var(--color-value)';
    if (color in PROJECT_HEX) return PROJECT_HEX[color as ProjectColor];
    if (isCustomProjectColor(color)) return color;

    return 'var(--color-value)';
};

export interface NamedGroup {
    id: string;
    name: string;
    color: string | null;
}
