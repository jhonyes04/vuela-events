import {
    GROUP_ORDER,
    SECTIONS,
    type GroupId,
    type SectionId,
} from '@/features/stats/lib/sections';

// Subconjunto de SECTIONS que se puede incluir en el PDF: todas salvo
// Pendientes (no tiene sentido en un informe, lleva acciones de edición).
export interface PrintSection {
    id: SectionId;
    label: string;
    group: GroupId;
    // Solo aplica cuando el año seleccionado en pantalla es "Todos".
    onlyAllYears?: boolean;
}

// Grupos en orden alfabético (GROUP_ORDER ya lo está); dentro de cada uno se
// conserva el orden de SECTIONS (mes antes que trimestre antes que año...).
export const PRINT_SECTIONS: PrintSection[] = GROUP_ORDER.filter(
    (group) => group !== 'Pendientes',
).flatMap((group) =>
    SECTIONS.filter((s) => s.group === group).map((s) => ({
        id: s.id,
        label: s.label,
        group: s.group,
        onlyAllYears: s.id === 'events-year',
    })),
);
