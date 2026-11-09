import { isoToMadridLocal, type EventItem } from '@/features/events/lib/events';

export interface FormValues {
    title: string;
    subtitle: string;
    location: string;
    modality: string;
    description: string;
    capacity: string;
    projectId: string;
    guideId: string;
    materialIds: string[];
    // Evento suelto
    startsAt: string;
    endsAt: string;
    // Serie recurrente (solo al crear; al editar no se usa)
    recurring: boolean;
    from: string;
    to: string;
    weekdays: number[];
    startTime: string;
    endTime: string;
}

export type TextField = Exclude<
    keyof FormValues,
    'recurring' | 'weekdays' | 'materialIds'
>;

// Campos que, al editar una sesión de una serie, se pueden propagar también
// a las sesiones futuras de esa misma serie.
export const SERIES_PROPAGATABLE_FIELDS = [
    'title',
    'subtitle',
    'location',
    'modality',
    'guideId',
    'materialIds',
    'capacity',
] as const;

export type SeriesField = (typeof SERIES_PROPAGATABLE_FIELDS)[number];

export const SERIES_FIELD_LABELS: Record<SeriesField, string> = {
    title: 'Título',
    subtitle: 'Subtítulo',
    location: 'Lugar',
    modality: 'Modalidad',
    guideId: 'Guía',
    materialIds: 'Materiales',
    capacity: 'Aforo',
};

// Compara los valores editados contra el evento original y devuelve qué
// campos propagables cambiaron realmente.
export const getChangedSeriesFields = (
    event: EventItem,
    values: FormValues,
    guideId: string,
): SeriesField[] => {
    const sameMaterials =
        values.materialIds.length === event.materials.length &&
        values.materialIds.every((id) =>
            event.materials.some((material) => material.id === id),
        );
    const newCapacity = values.capacity ? Number(values.capacity) : undefined;

    const changed: Record<SeriesField, boolean> = {
        title: values.title !== event.title,
        subtitle: (values.subtitle || '') !== (event.subtitle ?? ''),
        location: values.location !== (event.location ?? ''),
        modality: values.modality !== event.modality,
        guideId: guideId !== (event.guide?.id ?? ''),
        materialIds: !sameMaterials,
        capacity: newCapacity !== (event.capacity ?? undefined),
    };

    return SERIES_PROPAGATABLE_FIELDS.filter((field) => changed[field]);
};

export const EMPTY_FORM_VALUES: FormValues = {
    title: '',
    subtitle: '',
    location: '',
    modality: 'presencial',
    description: '',
    capacity: '',
    projectId: '',
    guideId: '',
    materialIds: [],
    startsAt: '',
    endsAt: '',
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
};

export const valuesFromEvent = (event: EventItem): FormValues => ({
    title: event.title,
    subtitle: event.subtitle ?? '',
    location: event.location ?? '',
    modality: event.modality,
    description: event.description ?? '',
    capacity: event.capacity ? String(event.capacity) : '',
    projectId: event.project.id,
    guideId: event.guide?.id ?? '',
    materialIds: event.materials.map((material) => material.id),
    startsAt: isoToMadridLocal(event.startsAt),
    endsAt: isoToMadridLocal(event.endsAt),
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
});
