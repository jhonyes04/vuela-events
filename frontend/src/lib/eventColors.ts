import type { EventItem } from '@/lib/events';

export interface EventColor {
    // Etiqueta dentro de la celda del calendario (fondo y texto legibles).
    chip: string;
    // Punto de color en pantallas pequeñas.
    dot: string;
}

// Color por defecto: el amarillo de marca con texto oscuro (10,6:1).
const DEFAULT_COLOR: EventColor = {
    chip: 'bg-brand-yellow text-brand-ink hover:brightness-95',
    dot: 'bg-brand-yellow ring-1 ring-brand-ink/40',
};

// Punto único de decisión del color. Cuando existan tipos de evento
// (p. ej. event.type), se elegirá aquí una paleta de contraste ya validada
// por tipo; el calendario no necesita ningún otro cambio.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const eventColor = (_event: EventItem): EventColor => DEFAULT_COLOR;
