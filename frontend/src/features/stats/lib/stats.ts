import { api } from '@/lib/api';

export type EventStatusFilter = 'all' | 'finished' | 'pending';

export const EVENT_STATUS_LABELS: Record<EventStatusFilter, string> = {
    all: 'Todos',
    finished: 'Finalizados',
    pending: 'Pendientes',
};

export interface SeriesPoint {
    key: string;
    count: number;
}

export interface StatsGroup {
    id: string;
    name: string;
    color: string | null;
    events: number;
    registrations: number;
    attended: number;
}

export interface ProjectInterestGroup {
    id: string;
    name: string;
    color: string | null;
    interestedUsers: number;
}

export interface ProjectParticipation {
    id: string;
    name: string;
    color: string | null;
    users: {
        id: string;
        name: string;
        puntoVuela: string | null;
        registrations: number;
    }[];
}

export interface UserParticipationSummary {
    projects: { id: string; name: string; color: string | null }[];
    rows: {
        id: string;
        puntoVuela: string | null;
        total: number;
        byProject: Record<string, number>;
    }[];
}

export interface StatsSummary {
    availableYears: number[];
    status: EventStatusFilter;
    totals: { events: number; registrations: number; attended: number };
    eventsByStatus: { past: number; ongoing: number; future: number };
    eventsByMonth: SeriesPoint[];
    eventsByQuarter: SeriesPoint[];
    eventsByYear: SeriesPoint[];
    eventsByProject: StatsGroup[];
    registrationsByMonth: SeriesPoint[];
    registrationsByProject: StatsGroup[];
    occupancy: {
        eventsWithCapacity: number;
        averageRate: number | null;
        fullEvents: number;
    };
    occupancyByMonth: SeriesPoint[];
    occupancyEvents: {
        id: string;
        title: string;
        startsAt: string;
        registrations: number;
        capacity: number;
    }[];
    topUsers: {
        id: string;
        name: string;
        puntoVuela: string | null;
        registrations: number;
    }[];
    usersWithoutRegistrations: number;
    registrationsByUser: {
        id: string;
        name: string;
        puntoVuela: string | null;
        registrations: number;
    }[];
    participationsByProject: ProjectParticipation[];
    participationsByUser: UserParticipationSummary;
    attendedByMonth: SeriesPoint[];
    attendedByQuarter: SeriesPoint[];
    attendedByYear: SeriesPoint[];
    attendedByProject: StatsGroup[];
    interestByProject: ProjectInterestGroup[];
    finishedWithoutAttended: {
        count: number;
        events: { id: string; title: string; startsAt: string }[];
    };
}

export const getStats = (year: number | null, status: EventStatusFilter) => {
    const params = new URLSearchParams({ status });

    if (year !== null) params.set('year', String(year));

    return api.get<StatsSummary>(`/stats?${params.toString()}`);
};

// Texto que aclara, en cada tarjeta, a qué eventos corresponden los datos.
export const statusDescription = (status: EventStatusFilter): string => {
    switch (status) {
        case 'all':
            return 'Incluye eventos finalizados, en curso y próximos.';
        case 'finished':
            return 'Solo eventos ya finalizados.';
        case 'pending':
            return 'Solo eventos pendientes (en curso o próximos).';
    }
};

const dateFormat = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export const formatStatsDate = (iso: string): string =>
    dateFormat.format(new Date(iso));

// "2026-10" -> "oct 26"
export const monthLabel = (key: string): string => {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);

    return date.toLocaleDateString('es-ES', {
        month: 'short',
        year: '2-digit',
    });
};

// "2026-T4" -> "T4 2026"
export const quarterLabel = (key: string): string => {
    const [year, quarter] = key.split('-');

    return `${quarter} ${year}`;
};
