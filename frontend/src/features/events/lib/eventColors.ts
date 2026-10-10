import { PROJECT_COLOR_STYLES } from '@/features/projects/lib/colors';
import { isFull, type EventItem } from '@/features/events/lib/events';

export interface EventColor {
    // Etiqueta dentro de la celda del calendario (fondo y texto legibles).
    chip: string;
    // Punto de color en pantallas pequeñas.
    dot: string;
}

// El color viene de la categoría del evento (categoría es obligatoria),
// salvo que esté completo: entonces se marca en rojo.
export const eventColor = (event: EventItem): EventColor => {
    const style = isFull(event)
        ? { chip: 'bg-red-500 text-white', swatch: 'bg-red-500' }
        : PROJECT_COLOR_STYLES[event.category.color];

    return {
        chip: `${style.chip} hover:brightness-95`,
        dot: `${style.swatch} ring-1 ring-foreground/20`,
    };
};
