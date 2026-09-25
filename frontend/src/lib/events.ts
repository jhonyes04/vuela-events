import { api } from '@/lib/api';

export interface EventItem {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number | null;
    createdAt: string;
    createdBy: { id: string; name: string };
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
