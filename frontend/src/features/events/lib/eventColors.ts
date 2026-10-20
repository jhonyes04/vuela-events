import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import {
    getProjectColorChip,
    getProjectColorSwatch,
} from '@/features/projects/lib/colors';
import { isFull, type EventItem } from '@/features/events/lib/events';

export interface EventColor {
    // Etiqueta dentro de la celda del calendario (fondo y texto legibles).
    chipClassName: string;
    chipStyle?: CSSProperties;
    // Punto de color en pantallas pequeñas.
    dotClassName: string;
    dotStyle?: CSSProperties;
}

// El color viene del proyecto del evento (el proyecto es obligatorio),
// salvo que esté completo: entonces se marca en rojo.
export const eventColor = (event: EventItem): EventColor => {
    if (isFull(event)) {
        return {
            chipClassName: 'bg-red-500 text-white hover:brightness-95',
            dotClassName: 'bg-red-500 ring-1 ring-foreground/20',
        };
    }

    const chip = getProjectColorChip(event.project.color);
    const swatch = getProjectColorSwatch(event.project.color);

    return {
        chipClassName: cn(chip.className, 'hover:brightness-95'),
        chipStyle: chip.style,
        dotClassName: cn(swatch.className, 'ring-1 ring-foreground/20'),
        dotStyle: swatch.style,
    };
};
