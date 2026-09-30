import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import type { EventItem } from '@/features/events/lib/events';

export interface EventColor {
    // Etiqueta dentro de la celda del calendario (fondo y texto legibles).
    chip: string;
    // Punto de color en pantallas pequeñas.
    dot: string;
}

// El color viene de la categoría del evento (categoría es obligatoria).
export const eventColor = (event: EventItem): EventColor => {
    const style = CATEGORY_COLOR_STYLES[event.category.color];

    return {
        chip: `${style.chip} hover:brightness-95`,
        dot: `${style.swatch} ring-1 ring-foreground/20`,
    };
};
