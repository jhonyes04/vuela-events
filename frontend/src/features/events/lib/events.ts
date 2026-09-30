import { api } from '@/lib/api';
import type { CategoryColor } from '@/features/categories/lib/colors';

export interface EventItem {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number | null;
    // Las sesiones creadas juntas comparten seriesId.
    seriesId: string | null;
    createdAt: string;
    createdBy: { id: string; name: string; puntoVuela: string | null };
    category: { id: string; name: string; color: CategoryColor };
    guide: { id: string; name: string; url: string };
    _count: { registrations: number };
    registered: boolean;
}

const TZ = 'Europe/Madrid';
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const dayLabelFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});

const timeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const monthLabelFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
});

const capitalize = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1);

// Formato requerido por Google Calendar: 'YYYYMMDDTHHmmssZ'
const toGoogleCalendarStamp = (iso: string): string =>
    iso.replace(/\.\d{3}/, '');

// Link para añadir el evento a Google Calendar del usuario
export const googleCalendarUrl = (event: EventItem): string => {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${toGoogleCalendarStamp(event.startsAt)}/${toGoogleCalendarStamp(event.endsAt)}`,
        ...(event.description && { details: event.description }),
        ...(event.location && { location: event.location }),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// 'YYYY-MM-DD' del día de Madrid en que ocurre esa fecha
export const dayKey = (iso: string): string =>
    dayKeyFormat.format(new Date(iso));

// 'jueves, 24 de septiembre'
export const formatDayLabel = (key: string): string =>
    capitalize(dayLabelFormat.format(new Date(`${key}T12:00:00Z`)));

// '09:00'
export const formatTime = (iso: string): string =>
    timeFormat.format(new Date(iso));

// 'Septiembre de 2026'. `month` va de 0 a 11
export const formatMonthLabel = (year: number, month: number): string =>
    capitalize(monthLabelFormat.format(new Date(Date.UTC(year, month, 1))));

// 'YYYY-MM' del mes indicado
export const monthKey = (year: number, month: number): string =>
    `${year}-${String(month + 1).padStart(2, '0')}`;

// Rango de consulta con un día de margen por lado; luego se filtra por día
const monthRange = (year: number, month: number) => ({
    from: new Date(Date.UTC(year, month, 1) - DAY_MS).toISOString(),
    to: new Date(Date.UTC(year, month + 1, 1) + DAY_MS).toISOString(),
});

export const listMonthEvents = async (
    year: number,
    month: number,
): Promise<EventItem[]> => {
    const { from, to } = monthRange(year, month);
    const query = new URLSearchParams({ from, to });

    const { events } = await api.get<{ events: EventItem[] }>(
        `/events?${query.toString()}`,
    );
    const prefix = monthKey(year, month);

    return events.filter((event) => dayKey(event.startsAt).startsWith(prefix));
};

export const groupByDay = (
    events: EventItem[],
): { key: string; events: EventItem[] }[] => {
    const groups = new Map<string, EventItem[]>();

    for (const event of events) {
        const key = dayKey(event.startsAt);

        groups.set(key, [...(groups.get(key) ?? []), event]);
    }

    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, list]) => ({ key, events: list }));
};

const wallClockFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

// Diferencia entre la hora de pared de Madrid y UTC en ese instante.
const madridOffsetMs = (instant: Date): number => {
    const parts = wallClockFormat.formatToParts(instant);
    const part = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value);
    const wallAsUtc = Date.UTC(
        part('year'),
        part('month') - 1,
        part('day'),
        part('hour'),
        part('minute'),
        part('second'),
    );

    return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

// 'YYYY-MM-DDTHH:mm' (hora de Madrid, como da datetime-local) -> ISO en UTC.
export const madridLocalToIso = (local: string): string => {
    const asIfUtc = new Date(`${local}:00Z`).getTime();
    let instant = asIfUtc - madridOffsetMs(new Date(asIfUtc));

    // Segundo ajuste por si el primer cálculo cruzó un cambio de hora.
    instant = asIfUtc - madridOffsetMs(new Date(instant));

    return new Date(instant).toISOString();
};

// Días ISO: 1 = lunes ... 7 = domingo (los mismos que usa el servidor).
export const WEEKDAYS = [
    { value: 1, short: 'L', label: 'Lunes' },
    { value: 2, short: 'M', label: 'Martes' },
    { value: 3, short: 'X', label: 'Miércoles' },
    { value: 4, short: 'J', label: 'Jueves' },
    { value: 5, short: 'V', label: 'Viernes' },
    { value: 6, short: 'S', label: 'Sábado' },
    { value: 7, short: 'D', label: 'Domingo' },
] as const;

// Deben coincidir con los límites del servidor (que es quien manda).
export const MAX_OCCURRENCES = 200;
const MAX_RANGE_DAYS = 731;

export interface RecurrencePreview {
    count: number;
    first: string | null;
    last: string | null;
    overLimit: boolean;
}

// Solo para mostrar "Se crearán N sesiones" antes de enviar; el servidor
// vuelve a calcular todo por su cuenta.
export const previewRecurrence = (
    from: string,
    to: string,
    weekdays: number[],
): RecurrencePreview | null => {
    if (!from || !to || weekdays.length === 0 || to < from) return null;

    const start = Date.parse(`${from}T00:00:00Z`);
    const end = Date.parse(`${to}T00:00:00Z`);

    if (Number.isNaN(start) || Number.isNaN(end)) return null;

    if ((end - start) / DAY_MS > MAX_RANGE_DAYS) {
        return { count: 0, first: null, last: null, overLimit: true };
    }

    const wanted = new Set(weekdays);
    let count = 0;
    let first: string | null = null;
    let last: string | null = null;

    for (let t = start; t <= end; t += DAY_MS) {
        const day = new Date(t);
        const isoWeekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();

        if (!wanted.has(isoWeekday)) continue;

        const key = day.toISOString().slice(0, 10);

        count += 1;
        first ??= key;
        last = key;
    }

    return { count, first, last, overLimit: count > MAX_OCCURRENCES };
};

const fullDateFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

// '2027-01-06' -> '6 de enero de 2027'
export const formatFullDate = (key: string): string =>
    fullDateFormat.format(new Date(`${key}T00:00:00Z`));

export interface RecurringPayload {
    title: string;
    subtitle?: string | undefined;
    description?: string | undefined;
    location: string;
    capacity?: number | undefined;
    categoryId: string;
    guideId: string;
    from: string;
    to: string;
    weekdays: number[];
    startTime: string;
    endTime: string;
}

export interface CreatedSeries {
    seriesId: string;
    count: number;
    firstStartsAt: string;
}

export const createRecurringEvents = (
    payload: RecurringPayload,
): Promise<CreatedSeries> =>
    api.post<CreatedSeries>('/events/recurring', payload);

export const deleteEventById = (id: string): Promise<void> =>
    api.delete(`/events/${id}`);

export const deleteEventSeriesById = (
    seriesId: string,
): Promise<{ deletedCount: number }> =>
    api.delete(`/events/series/${seriesId}`);

export const registerForEventById = async (id: string): Promise<void> => {
    await api.post<unknown>(`/events/${id}/registrations`);
};

export const unregisterFromEventById = (id: string): Promise<void> =>
    api.delete(`/events/${id}/registrations`);

// Solo orientan la interfaz; el servidor vuelve a comprobar ambas cosas.
export const hasEnded = (event: EventItem, now: number = Date.now()): boolean =>
    new Date(event.endsAt).getTime() <= now;

export const isFull = (event: EventItem): boolean =>
    event.capacity !== null && event._count.registrations >= event.capacity;

// '3 inscritos' o '3 de 20 plazas'. El servidor ya excluye a los DT del recuento.
export const attendanceLabel = (event: EventItem): string => {
    const taken = event._count.registrations;

    if (event.capacity === null) {
        return `${taken} ${taken === 1 ? 'inscrito' : 'inscritos'}`;
    }

    return `${taken} de ${event.capacity} plazas`;
};

// 'Pueblo Nuevo Axarquía (Ana Vanesa García López)'; sin Punto Vuela, solo el nombre.
export const personLabel = (person: {
    name: string;
    puntoVuela: string | null;
}): string =>
    person.puntoVuela ? `${person.puntoVuela} (${person.name})` : person.name;

export interface Attendee {
    id: string;
    name: string;
    puntoVuela: string | null;
}

// Personas inscritas en un evento (el servidor excluye a los DT).
export const listAttendees = async (eventId: string): Promise<Attendee[]> => {
    const { registrations } = await api.get<{ registrations: Attendee[] }>(
        `/events/${eventId}/registrations`,
    );

    return registrations;
};
