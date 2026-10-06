import { prisma } from '../lib/prisma.js';

const TZ = 'Europe/Madrid';

const monthFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
});

// Clave "AAAA-MM" en hora de Madrid: así se agrupa como lo ve la gente.
const monthKey = (date: Date): string => {
    const parts = monthFormat.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';

    return `${year}-${month}`;
};

const quarterKey = (key: string): string => {
    const [year, month] = key.split('-');
    const quarter = Math.ceil(Number(month) / 3);

    return `${year}-T${quarter}`;
};

const sortedSeries = (map: Map<string, number>) =>
    [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({ key, count }));

const sumByMonth = (
    events: EventRow[],
    value: (event: EventRow) => number,
) => {
    const map = new Map<string, number>();

    for (const event of events) {
        const key = monthKey(event.startsAt);

        map.set(key, (map.get(key) ?? 0) + value(event));
    }

    return sortedSeries(map);
};

const percent = (value: number) => Math.round(value * 1000) / 10;

interface EventRow {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
    participantsCount: number | null;
    category: { id: string; name: string; color: string };
    guide: { id: string; name: string };
    createdBy: { puntoVuela: string | null };
    _count: { registrations: number };
}

interface Group {
    id: string;
    name: string;
    color: string | null;
    events: number;
    registrations: number;
    attended: number;
}

// Agrupa eventos por una clave (categoría, guía, Punto Vuela...) y suma totales.
const groupEvents = (
    events: EventRow[],
    pick: (event: EventRow) => { id: string; name: string; color: string | null },
): Group[] => {
    const groups = new Map<string, Group>();

    for (const event of events) {
        const { id, name, color } = pick(event);
        const group = groups.get(id) ?? {
            id,
            name,
            color,
            events: 0,
            registrations: 0,
            attended: 0,
        };

        group.events += 1;
        group.registrations += event._count.registrations;
        group.attended += event.participantsCount ?? 0;
        groups.set(id, group);
    }

    return [...groups.values()].sort((a, b) => b.events - a.events);
};

export const getStats = async (now: Date = new Date()) => {
    const events: EventRow[] = await prisma.event.findMany({
        select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            participantsCount: true,
            category: { select: { id: true, name: true, color: true } },
            guide: { select: { id: true, name: true } },
            createdBy: { select: { puntoVuela: true } },
            _count: { select: { registrations: true } },
        },
    });

    const registrationGroups = await prisma.registration.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
    });

    const topUserRows = await prisma.user.findMany({
        where: { id: { in: registrationGroups.map((g) => g.userId) } },
        select: { id: true, name: true, lastName: true, puntoVuela: true },
    });

    const topUsers = registrationGroups.map((group) => {
        const user = topUserRows.find((row) => row.id === group.userId);

        return {
            id: group.userId,
            name: user ? `${user.name} ${user.lastName}`.trim() : '—',
            puntoVuela: user?.puntoVuela ?? null,
            registrations: group._count.userId,
        };
    });

    const usersWithoutRegistrations = await prisma.user.count({
        where: { active: true, registrations: { none: {} } },
    });

    const past = events.filter((e) => e.endsAt <= now).length;
    const ongoing = events.filter(
        (e) => e.startsAt <= now && e.endsAt > now,
    ).length;
    const future = events.filter((e) => e.startsAt > now).length;

    const eventsByMonth = sumByMonth(events, () => 1);
    const registrationsByMonth = sumByMonth(
        events,
        (e) => e._count.registrations,
    );
    const attendedByMonth = sumByMonth(events, (e) => e.participantsCount ?? 0);

    const eventsByQuarterMap = new Map<string, number>();
    const eventsByYearMap = new Map<string, number>();

    for (const point of eventsByMonth) {
        const quarter = quarterKey(point.key);
        const year = point.key.slice(0, 4);

        eventsByQuarterMap.set(
            quarter,
            (eventsByQuarterMap.get(quarter) ?? 0) + point.count,
        );
        eventsByYearMap.set(
            year,
            (eventsByYearMap.get(year) ?? 0) + point.count,
        );
    }

    const attendedByYearMap = new Map<string, number>();

    for (const point of attendedByMonth) {
        const year = point.key.slice(0, 4);

        attendedByYearMap.set(
            year,
            (attendedByYearMap.get(year) ?? 0) + point.count,
        );
    }

    const attendedByQuarterMap = new Map<string, number>();

    for (const point of attendedByMonth) {
        const quarter = quarterKey(point.key);

        attendedByQuarterMap.set(
            quarter,
            (attendedByQuarterMap.get(quarter) ?? 0) + point.count,
        );
    }

    const capacities = events.flatMap((e) =>
        e.capacity && e.capacity > 0
            ? [{ registrations: e._count.registrations, capacity: e.capacity }]
            : [],
    );
    const rates = capacities.map((c) => c.registrations / c.capacity);
    const averageRate =
        rates.length > 0
            ? percent(rates.reduce((sum, r) => sum + r, 0) / rates.length)
            : null;

    const finishedWithoutAttended = events
        .filter((e) => e.endsAt <= now && e.participantsCount === null)
        .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

    return {
        totals: {
            events: events.length,
            registrations: events.reduce(
                (sum, e) => sum + e._count.registrations,
                0,
            ),
            attended: events.reduce(
                (sum, e) => sum + (e.participantsCount ?? 0),
                0,
            ),
        },
        eventsByStatus: { past, ongoing, future },
        eventsByMonth,
        eventsByQuarter: sortedSeries(eventsByQuarterMap),
        eventsByYear: sortedSeries(eventsByYearMap),
        eventsByCategory: groupEvents(events, (e) => ({
            id: e.category.id,
            name: e.category.name,
            color: e.category.color,
        })),
        eventsByGuide: groupEvents(events, (e) => ({
            id: e.guide.id,
            name: e.guide.name,
            color: null,
        })),
        registrationsByMonth,
        registrationsByCategory: groupEvents(events, (e) => ({
            id: e.category.id,
            name: e.category.name,
            color: e.category.color,
        })),
        topEvents: [...events]
            .sort((a, b) => b._count.registrations - a._count.registrations)
            .slice(0, 10)
            .map((e) => ({
                id: e.id,
                title: e.title,
                startsAt: e.startsAt,
                registrations: e._count.registrations,
            })),
        occupancy: {
            eventsWithCapacity: capacities.length,
            averageRate,
            fullEvents: capacities.filter(
                (c) => c.registrations >= c.capacity,
            ).length,
        },
        occupancyEvents: events
            .flatMap((e) =>
                e.capacity && e.capacity > 0
                    ? [
                          {
                              id: e.id,
                              title: e.title,
                              startsAt: e.startsAt,
                              registrations: e._count.registrations,
                              capacity: e.capacity,
                          },
                      ]
                    : [],
            )
            .sort(
                (a, b) =>
                    b.registrations / b.capacity - a.registrations / a.capacity,
            )
            .slice(0, 10),
        topUsers,
        usersWithoutRegistrations,
        attendedByMonth,
        attendedByCategory: groupEvents(events, (e) => ({
            id: e.category.id,
            name: e.category.name,
            color: e.category.color,
        })),
        attendedByQuarter: sortedSeries(attendedByQuarterMap),
        attendedByYear: sortedSeries(attendedByYearMap),
        finishedWithoutAttended: {
            count: finishedWithoutAttended.length,
            events: finishedWithoutAttended.slice(0, 20).map((e) => ({
                id: e.id,
                title: e.title,
                startsAt: e.startsAt,
            })),
        },
    };
};
