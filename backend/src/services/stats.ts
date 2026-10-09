import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { listCategoryInterestedUsers } from './categoryPreferences.js';

const quarterKey = (key: string): string => {
    const [year, month] = key.split('-');
    const quarter = Math.ceil(Number(month) / 3);

    return `${year}-T${quarter}`;
};

const sortedSeries = (map: Map<string, number>) =>
    [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({ key, count }));

// A partir de la serie mensual (ya agregada en SQL) se derivan trimestre y
// año: son muy pocos puntos, así que sumarlos en JS no tiene coste real.
const rollUp = (monthly: { key: string; count: number }[]) => {
    const byQuarter = new Map<string, number>();
    const byYear = new Map<string, number>();

    for (const point of monthly) {
        const quarter = quarterKey(point.key);
        const year = point.key.slice(0, 4);

        byQuarter.set(quarter, (byQuarter.get(quarter) ?? 0) + point.count);
        byYear.set(year, (byYear.get(year) ?? 0) + point.count);
    }

    return { byQuarter: sortedSeries(byQuarter), byYear: sortedSeries(byYear) };
};

const percent = (value: number) => Math.round(value * 1000) / 10;

interface Group {
    id: string;
    name: string;
    color: string | null;
    events: number;
    registrations: number;
    attended: number;
}

interface MonthRow {
    month: string;
    events: number;
    registrations: number;
    attended: number;
}

interface TotalsRow {
    eventsTotal: number;
    registrationsTotal: number;
    attendedTotal: number;
    past: number;
    ongoing: number;
    future: number;
}

interface OccupancyRow {
    eventsWithCapacity: number;
    avgRate: number | null;
    fullEvents: number;
}

interface TopEventRow {
    id: string;
    title: string;
    startsAt: Date;
    registrations: number;
}

interface OccupancyEventRow {
    id: string;
    title: string;
    startsAt: Date;
    registrations: number;
    capacity: number;
}

interface FinishedEventRow {
    id: string;
    title: string;
    startsAt: Date;
}

// Cuenta de inscripciones por evento, reutilizada por cada consulta agregada.
// "startsAt" se guarda sin zona horaria pero representa un instante UTC (así
// lo trata Prisma): la doble conversión AT TIME ZONE pasa de ese instante a
// la hora local de Madrid, igual que hacía antes Intl.DateTimeFormat en JS
// (verificado contra casos de cambio de mes y de horario de verano/invierno).
const regCountsCte = Prisma.sql`
    WITH reg_counts AS (
        SELECT "eventId", count(*)::int AS cnt
        FROM registrations
        GROUP BY "eventId"
    )
`;

export const getStats = async (now: Date = new Date()) => {
    const totalsRows = await prisma.$queryRaw<TotalsRow[]>`
        SELECT
            (SELECT count(*)::int FROM events) AS "eventsTotal",
            (SELECT count(*)::int FROM registrations) AS "registrationsTotal",
            (SELECT coalesce(sum("participantsCount"), 0)::int FROM events) AS "attendedTotal",
            (SELECT count(*)::int FROM events WHERE "endsAt" <= ${now}) AS "past",
            (SELECT count(*)::int FROM events WHERE "startsAt" <= ${now} AND "endsAt" > ${now}) AS "ongoing",
            (SELECT count(*)::int FROM events WHERE "startsAt" > ${now}) AS "future"
    `;
    // Agregado puro sin GROUP BY: devuelve siempre exactamente una fila.
    const totalsRow = totalsRows[0]!;

    const months = await prisma.$queryRaw<MonthRow[]>`
        ${regCountsCte}
        SELECT
            to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') AS month,
            count(*)::int AS events,
            coalesce(sum(rc.cnt), 0)::int AS registrations,
            coalesce(sum(e."participantsCount"), 0)::int AS attended
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        GROUP BY 1
        ORDER BY 1
    `;

    const eventsByMonth = months.map((m) => ({ key: m.month, count: m.events }));
    const registrationsByMonth = months.map((m) => ({
        key: m.month,
        count: m.registrations,
    }));
    const attendedByMonth = months.map((m) => ({
        key: m.month,
        count: m.attended,
    }));

    const eventsRollup = rollUp(eventsByMonth);
    const attendedRollup = rollUp(attendedByMonth);

    const byCategory = await prisma.$queryRaw<Group[]>`
        ${regCountsCte}
        SELECT
            c.id,
            c.name,
            c.color,
            count(*)::int AS events,
            coalesce(sum(rc.cnt), 0)::int AS registrations,
            coalesce(sum(e."participantsCount"), 0)::int AS attended
        FROM events e
        JOIN categories c ON c.id = e."categoryId"
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        GROUP BY c.id, c.name, c.color
        ORDER BY events DESC
    `;

    const byGuide = await prisma.$queryRaw<Group[]>`
        ${regCountsCte}
        SELECT
            g.id,
            g.name,
            NULL AS color,
            count(*)::int AS events,
            coalesce(sum(rc.cnt), 0)::int AS registrations,
            coalesce(sum(e."participantsCount"), 0)::int AS attended
        FROM events e
        JOIN guides g ON g.id = e."guideId"
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        GROUP BY g.id, g.name
        ORDER BY events DESC
    `;

    const topEventRows = await prisma.$queryRaw<TopEventRow[]>`
        ${regCountsCte}
        SELECT e.id, e.title, e."startsAt", coalesce(rc.cnt, 0)::int AS registrations
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        ORDER BY registrations DESC, e."startsAt" DESC
        LIMIT 10
    `;

    const occupancyRows = await prisma.$queryRaw<OccupancyRow[]>`
        ${regCountsCte}
        SELECT
            count(*)::int AS "eventsWithCapacity",
            avg(coalesce(rc.cnt, 0)::float8 / e.capacity) AS "avgRate",
            count(*) FILTER (WHERE coalesce(rc.cnt, 0) >= e.capacity)::int AS "fullEvents"
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE e.capacity IS NOT NULL AND e.capacity > 0
    `;
    const occupancyRow = occupancyRows[0]!;

    const occupancyEventRows = await prisma.$queryRaw<OccupancyEventRow[]>`
        ${regCountsCte}
        SELECT e.id, e.title, e."startsAt", coalesce(rc.cnt, 0)::int AS registrations, e.capacity
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE e.capacity IS NOT NULL AND e.capacity > 0
        ORDER BY (coalesce(rc.cnt, 0)::float8 / e.capacity) DESC
        LIMIT 10
    `;

    const finishedWithoutAttendedCountRows = await prisma.$queryRaw<
        { count: number }[]
    >`
        SELECT count(*)::int AS count
        FROM events
        WHERE "endsAt" <= ${now} AND "participantsCount" IS NULL
    `;
    const finishedWithoutAttendedCount = finishedWithoutAttendedCountRows[0]!.count;

    const finishedWithoutAttendedRows = await prisma.$queryRaw<
        FinishedEventRow[]
    >`
        SELECT id, title, "startsAt"
        FROM events
        WHERE "endsAt" <= ${now} AND "participantsCount" IS NULL
        ORDER BY "startsAt" DESC
        LIMIT 20
    `;

    const registrationGroups = await prisma.registration.groupBy({
        by: ['userId'],
        where: { user: { roleId: 'ail' } },
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
        where: { active: true, roleId: 'ail', registrations: { none: {} } },
    });

    const registrationsByUserRows = await prisma.$queryRaw<
        { id: string; name: string; lastName: string; puntoVuela: string | null; registrations: number }[]
    >`
        SELECT
            u.id,
            u.name,
            u."lastName",
            u."puntoVuela",
            coalesce(rc.cnt, 0)::int AS registrations
        FROM users u
        LEFT JOIN (
            SELECT "userId", count(*)::int AS cnt
            FROM registrations
            GROUP BY "userId"
        ) rc ON rc."userId" = u.id
        WHERE u.active = true AND u."roleId" = 'ail'
        ORDER BY registrations DESC, u.name ASC, u."lastName" ASC
    `;

    const registrationsByUser = registrationsByUserRows.map((row) => ({
        id: row.id,
        name: `${row.name} ${row.lastName}`.trim(),
        puntoVuela: row.puntoVuela,
        registrations: row.registrations,
    }));

    const interestByCategory = (await listCategoryInterestedUsers())
        .map((category) => ({
            id: category.id,
            name: category.name,
            color: category.color,
            interestedUsers: category.users.length,
        }))
        .sort(
            (a, b) =>
                b.interestedUsers - a.interestedUsers ||
                a.name.localeCompare(b.name),
        );

    return {
        totals: {
            events: totalsRow.eventsTotal,
            registrations: totalsRow.registrationsTotal,
            attended: totalsRow.attendedTotal,
        },
        eventsByStatus: {
            past: totalsRow.past,
            ongoing: totalsRow.ongoing,
            future: totalsRow.future,
        },
        eventsByMonth,
        eventsByQuarter: eventsRollup.byQuarter,
        eventsByYear: eventsRollup.byYear,
        eventsByCategory: byCategory,
        eventsByGuide: byGuide,
        registrationsByMonth,
        registrationsByCategory: byCategory,
        topEvents: topEventRows,
        occupancy: {
            eventsWithCapacity: occupancyRow.eventsWithCapacity,
            averageRate:
                occupancyRow.avgRate === null
                    ? null
                    : percent(occupancyRow.avgRate),
            fullEvents: occupancyRow.fullEvents,
        },
        occupancyEvents: occupancyEventRows,
        topUsers,
        usersWithoutRegistrations,
        registrationsByUser,
        attendedByMonth,
        attendedByCategory: byCategory,
        attendedByQuarter: attendedRollup.byQuarter,
        attendedByYear: attendedRollup.byYear,
        interestByCategory,
        finishedWithoutAttended: {
            count: finishedWithoutAttendedCount,
            events: finishedWithoutAttendedRows,
        },
    };
};
