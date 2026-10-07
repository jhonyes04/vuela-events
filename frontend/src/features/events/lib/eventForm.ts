import { isoToMadridLocal, type EventItem } from '@/features/events/lib/events';

export interface FormValues {
    title: string;
    subtitle: string;
    location: string;
    description: string;
    capacity: string;
    categoryId: string;
    guideId: string;
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

export type TextField = Exclude<keyof FormValues, 'recurring' | 'weekdays'>;

export const EMPTY_FORM_VALUES: FormValues = {
    title: '',
    subtitle: '',
    location: '',
    description: '',
    capacity: '',
    categoryId: '',
    guideId: '',
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
    description: event.description ?? '',
    capacity: event.capacity ? String(event.capacity) : '',
    categoryId: event.category.id,
    guideId: event.guide.id,
    startsAt: isoToMadridLocal(event.startsAt),
    endsAt: isoToMadridLocal(event.endsAt),
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
});
