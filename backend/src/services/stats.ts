import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { listProjectInterestedUsers } from './projectPreferences.js';

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

interface ParticipationRow {
    projectId: string;
    projectName: string;
    projectColor: string | null;
    userId: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    registrations: number;
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

export const getStats = async (
    now: Date = new Date(),
    year: number | null = null,
) => {
    // Mismo criterio de zona horaria que el resto del fichero: el año se
    // calcula en hora de Madrid, no en UTC.
    const yearFilter =
        year === null
            ? Prisma.sql`true`
            : Prisma.sql`to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY') = ${String(year)}`;

    const yearRows = await prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT
            to_char("startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY')::int AS year
        FROM events
        ORDER BY year DESC
    `;
    const availableYears = yearRows.map((row) => row.year);

    const totalsRows = await prisma.$queryRaw<TotalsRow[]>`
        SELECT
            (SELECT count(*)::int FROM events e WHERE ${yearFilter}) AS "eventsTotal",
            (SELECT count(*)::int FROM registrations r JOIN events e ON e.id = r."eventId" WHERE ${yearFilter}) AS "registrationsTotal",
            (SELECT coalesce(sum(e."participantsCount"), 0)::int FROM events e WHERE ${yearFilter}) AS "attendedTotal",
            (SELECT count(*)::int FROM events e WHERE e."endsAt" <= ${now} AND ${yearFilter}) AS "past",
            (SELECT count(*)::int FROM events e WHERE e."startsAt" <= ${now} AND e."endsAt" > ${now} AND ${yearFilter}) AS "ongoing",
            (SELECT count(*)::int FROM events e WHERE e."startsAt" > ${now} AND ${yearFilter}) AS "future"
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
        WHERE ${yearFilter}
        GROUP BY 1
        ORDER BY 1
    `;

    const eventsByMonth = months.map((m) => ({
        key: m.month,
        count: m.events,
    }));
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

    const byProject = await prisma.$queryRaw<Group[]>`
        ${regCountsCte}
        SELECT
            c.id,
            c.name,
            c.color,
            count(e.id)::int AS events,
            coalesce(sum(rc.cnt), 0)::int AS registrations,
            coalesce(sum(e."participantsCount"), 0)::int AS attended
        FROM projects c
        LEFT JOIN events e ON e."projectId" = c.id AND ${yearFilter}
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        GROUP BY c.id, c.name, c.color
        ORDER BY events DESC
    `;

    const occupancyRows = await prisma.$queryRaw<OccupancyRow[]>`
        ${regCountsCte}
        SELECT
            count(*)::int AS "eventsWithCapacity",
            avg(coalesce(rc.cnt, 0)::float8 / e.capacity) AS "avgRate",
            count(*) FILTER (WHERE coalesce(rc.cnt, 0) >= e.capacity)::int AS "fullEvents"
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE e.capacity IS NOT NULL AND e.capacity > 0 AND ${yearFilter}
    `;
    const occupancyRow = occupancyRows[0]!;

    const occupancyMonthRows = await prisma.$queryRaw<
        { month: string; avgRate: number | null }[]
    >`
        ${regCountsCte}
        SELECT
            to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') AS month,
            avg(coalesce(rc.cnt, 0)::float8 / e.capacity) AS "avgRate"
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE e.capacity IS NOT NULL AND e.capacity > 0 AND ${yearFilter}
        GROUP BY 1
        ORDER BY 1
    `;

    const occupancyByMonth = occupancyMonthRows.map((row) => ({
        key: row.month,
        count: row.avgRate === null ? 0 : percent(row.avgRate),
    }));

    const occupancyEventRows = await prisma.$queryRaw<OccupancyEventRow[]>`
        ${regCountsCte}
        SELECT e.id, e.title, e."startsAt", coalesce(rc.cnt, 0)::int AS registrations, e.capacity
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE e.capacity IS NOT NULL AND e.capacity > 0 AND e."endsAt" > ${now} AND ${yearFilter}
        ORDER BY e."endsAt" ASC
        LIMIT 10
    `;

    const finishedWithoutAttendedCountRows = await prisma.$queryRaw<
        { count: number }[]
    >`
        SELECT count(*)::int AS count
        FROM events e
        WHERE e."endsAt" <= ${now} AND e."participantsCount" IS NULL AND ${yearFilter}
    `;
    const finishedWithoutAttendedCount =
        finishedWithoutAttendedCountRows[0]!.count;

    const finishedWithoutAttendedRows = await prisma.$queryRaw<
        FinishedEventRow[]
    >`
        SELECT e.id, e.title, e."startsAt"
        FROM events e
        WHERE e."endsAt" <= ${now} AND e."participantsCount" IS NULL AND ${yearFilter}
        ORDER BY e."startsAt" DESC
        LIMIT 20
    `;

    const registrationGroupRows = await prisma.$queryRaw<
        { userId: string; cnt: number }[]
    >`
        SELECT r."userId", count(*)::int AS cnt
        FROM registrations r
        JOIN users u ON u.id = r."userId"
        JOIN events e ON e.id = r."eventId"
        WHERE u."roleId" = 'ail' AND ${yearFilter}
        GROUP BY r."userId"
        ORDER BY cnt DESC
        LIMIT 10
    `;

    const topUserRows = await prisma.user.findMany({
        where: { id: { in: registrationGroupRows.map((g) => g.userId) } },
        select: { id: true, name: true, lastName: true, puntoVuela: true },
    });

    const topUsers = registrationGroupRows.map((group) => {
        const user = topUserRows.find((row) => row.id === group.userId);

        return {
            id: group.userId,
            name: user ? `${user.name} ${user.lastName}`.trim() : '—',
            puntoVuela: user?.puntoVuela ?? null,
            registrations: group.cnt,
        };
    });

    const usersWithoutRegistrationsRows = await prisma.$queryRaw<
        { count: number }[]
    >`
        SELECT count(*)::int AS count
        FROM users u
        WHERE u.active = true AND u."roleId" = 'ail'
        AND NOT EXISTS (
            SELECT 1
            FROM registrations r
            JOIN events e ON e.id = r."eventId"
            WHERE r."userId" = u.id AND ${yearFilter}
        )
    `;
    const usersWithoutRegistrations = usersWithoutRegistrationsRows[0]!.count;

    const registrationsByUserRows = await prisma.$queryRaw<
        {
            id: string;
            name: string;
            lastName: string;
            puntoVuela: string | null;
            registrations: number;
        }[]
    >`
        SELECT
            u.id,
            u.name,
            u."lastName",
            u."puntoVuela",
            coalesce(rc.cnt, 0)::int AS registrations
        FROM users u
        LEFT JOIN (
            SELECT r."userId", count(*)::int AS cnt
            FROM registrations r
            JOIN events e ON e.id = r."eventId"
            WHERE ${yearFilter}
            GROUP BY r."userId"
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

    const participationsByProjectRows = await prisma.$queryRaw<
        ParticipationRow[]
    >`
        SELECT
            p.id AS "projectId",
            p.name AS "projectName",
            p.color AS "projectColor",
            u.id AS "userId",
            u.name,
            u."lastName",
            u."puntoVuela",
            count(*)::int AS registrations
        FROM registrations r
        JOIN users u ON u.id = r."userId"
        JOIN events e ON e.id = r."eventId"
        JOIN projects p ON p.id = e."projectId"
        WHERE u.active = true AND u."roleId" = 'ail' AND ${yearFilter}
        GROUP BY p.id, p.name, p.color, u.id, u.name, u."lastName", u."puntoVuela"
        ORDER BY p.name ASC, registrations DESC, u.name ASC, u."lastName" ASC
    `;

    const participationsByProjectMap = new Map<
        string,
        {
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
    >();

    for (const project of byProject) {
        participationsByProjectMap.set(project.id, {
            id: project.id,
            name: project.name,
            color: project.color,
            users: [],
        });
    }

    for (const row of participationsByProjectRows) {
        if (!participationsByProjectMap.has(row.projectId)) {
            participationsByProjectMap.set(row.projectId, {
                id: row.projectId,
                name: row.projectName,
                color: row.projectColor,
                users: [],
            });
        }

        participationsByProjectMap.get(row.projectId)!.users.push({
            id: row.userId,
            name: `${row.name} ${row.lastName}`.trim(),
            puntoVuela: row.puntoVuela,
            registrations: row.registrations,
        });
    }

    const participationsByProject = [
        ...participationsByProjectMap.values(),
    ].sort(
        (a, b) =>
            b.users.length - a.users.length || a.name.localeCompare(b.name),
    );

    const participationsByUserMap = new Map<
        string,
        {
            id: string;
            puntoVuela: string | null;
            total: number;
            byProject: Record<string, number>;
        }
    >();

    for (const row of participationsByProjectRows) {
        if (!participationsByUserMap.has(row.userId)) {
            participationsByUserMap.set(row.userId, {
                id: row.userId,
                puntoVuela: row.puntoVuela,
                total: 0,
                byProject: {},
            });
        }

        const entry = participationsByUserMap.get(row.userId)!;

        entry.byProject[row.projectId] = row.registrations;
        entry.total += row.registrations;
    }

    const participationsByUser = {
        projects: participationsByProject.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
        })),
        rows: [...participationsByUserMap.values()].sort(
            (a, b) =>
                b.total - a.total ||
                (a.puntoVuela ?? '').localeCompare(b.puntoVuela ?? ''),
        ),
    };

    const interestByProject = (await listProjectInterestedUsers())
        .map((project) => ({
            id: project.id,
            name: project.name,
            color: project.color,
            interestedUsers: project.users.length,
        }))
        .sort(
            (a, b) =>
                b.interestedUsers - a.interestedUsers ||
                a.name.localeCompare(b.name),
        );

    return {
        availableYears,
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
        eventsByProject: byProject,
        registrationsByMonth,
        registrationsByProject: byProject,
        occupancy: {
            eventsWithCapacity: occupancyRow.eventsWithCapacity,
            averageRate:
                occupancyRow.avgRate === null
                    ? null
                    : percent(occupancyRow.avgRate),
            fullEvents: occupancyRow.fullEvents,
        },
        occupancyByMonth,
        occupancyEvents: occupancyEventRows,
        topUsers,
        usersWithoutRegistrations,
        registrationsByUser,
        participationsByProject,
        participationsByUser,
        attendedByMonth,
        attendedByProject: byProject,
        attendedByQuarter: attendedRollup.byQuarter,
        attendedByYear: attendedRollup.byYear,
        interestByProject,
        finishedWithoutAttended: {
            count: finishedWithoutAttendedCount,
            events: finishedWithoutAttendedRows,
        },
    };
};
