import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

// Acciones de audit_logs que cuentan como "sensibles" para este panel: tocan
// permisos, roles o el acceso de un usuario a la app.
const SENSITIVE_AUDIT_ACTIONS = [
    'role_change',
    'active_change',
    'role_permissions_changed',
    'role_created',
    'role_deleted',
    'user_deleted',
] as const;

interface SensitiveActionRow {
    id: string;
    action: string;
    createdAt: Date;
    actorName: string | null;
    targetName: string | null;
}

interface IdleProjectRow {
    id: string;
    name: string;
    color: string;
    lastEventAt: Date | null;
}

interface SignupRow {
    month: string;
    roleId: string;
    count: number;
}

interface YoyRow {
    month: string;
    events: number;
    registrations: number;
}

const percent = (value: number) => Math.round(value * 1000) / 10;

export const getMetrics = async (now: Date = new Date(), days = 30) => {
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // --- Usuarios: perfiles incompletos ---
    const incompleteProfiles = await prisma.user.count({
        where: { active: true, profileCompletedAt: null },
    });

    // --- Usuarios: inactivos (AIL sin inscripción en la ventana) ---
    const inactiveAilCount = await prisma.user.count({
        where: {
            active: true,
            roleId: 'ail',
            registrations: { none: { createdAt: { gte: windowStart } } },
        },
    });

    // --- Usuarios: altas por mes y rol (en la ventana elegida) ---
    const signupRows = await prisma.$queryRaw<SignupRow[]>`
        SELECT
            to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') AS month,
            "roleId",
            count(*)::int AS count
        FROM users
        WHERE "createdAt" >= ${windowStart}
        GROUP BY 1, 2
        ORDER BY 1, 2
    `;
    const signupsByMonth = signupRows;

    // --- Usuarios: todos los roles que existen (fijos o creados a mano) ---
    const roles = await prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
    });

    // --- Sistema: acciones sensibles recientes ---
    const sensitiveActions = await prisma.$queryRaw<SensitiveActionRow[]>`
        SELECT
            a.id,
            a.action,
            a."createdAt",
            trim(concat(actor.name, ' ', actor."lastName")) AS "actorName",
            trim(concat(target.name, ' ', target."lastName")) AS "targetName"
        FROM audit_logs a
        LEFT JOIN users actor ON actor.id = a."actorId"
        LEFT JOIN users target ON target.id = a."targetId"
        WHERE a.action IN (${Prisma.join(SENSITIVE_AUDIT_ACTIONS)})
        ORDER BY a."createdAt" DESC
        LIMIT 20
    `;

    // --- Eventos: series vs sueltos, terminados vs no terminados ---
    const seriesVsSingleRows = await prisma.$queryRaw<
        {
            finishedSeries: number;
            finishedSingle: number;
            ongoingSeries: number;
            ongoingSingle: number;
        }[]
    >`
        SELECT
            count(*) FILTER (WHERE "seriesId" IS NOT NULL AND "endsAt" <= ${now})::int AS "finishedSeries",
            count(*) FILTER (WHERE "seriesId" IS NULL AND "endsAt" <= ${now})::int AS "finishedSingle",
            count(*) FILTER (WHERE "seriesId" IS NOT NULL AND "endsAt" > ${now})::int AS "ongoingSeries",
            count(*) FILTER (WHERE "seriesId" IS NULL AND "endsAt" > ${now})::int AS "ongoingSingle"
        FROM events
    `;
    const seriesVsSingleRow = seriesVsSingleRows[0]!;
    const seriesVsSingle = {
        finished: {
            series: seriesVsSingleRow.finishedSeries,
            single: seriesVsSingleRow.finishedSingle,
        },
        ongoing: {
            series: seriesVsSingleRow.ongoingSeries,
            single: seriesVsSingleRow.ongoingSingle,
        },
    };

    // --- Eventos: antelación media de creación (eventos creados en la ventana) ---
    const leadTimeRows = await prisma.$queryRaw<{ avgDays: number | null }[]>`
        SELECT avg(extract(epoch FROM ("startsAt" - "createdAt")) / 86400) AS "avgDays"
        FROM events
        WHERE "createdAt" >= ${windowStart}
    `;
    const avgLeadTimeDays =
        leadTimeRows[0]!.avgDays === null
            ? null
            : Math.round(leadTimeRows[0]!.avgDays * 10) / 10;

    // --- Eventos: proyectos sin eventos recientes ---
    const idleProjects = await prisma.$queryRaw<IdleProjectRow[]>`
        SELECT p.id, p.name, p.color, max(e."createdAt") AS "lastEventAt"
        FROM projects p
        LEFT JOIN events e ON e."projectId" = p.id
        WHERE p.active = true
        GROUP BY p.id, p.name, p.color
        HAVING max(e."createdAt") IS NULL OR max(e."createdAt") < ${windowStart}
        ORDER BY "lastEventAt" ASC NULLS FIRST
    `;

    // --- Tendencia: comparativa año actual vs anterior ---
    const yoyRows = await prisma.$queryRaw<(YoyRow & { year: string })[]>`
        WITH reg_counts AS (
            SELECT "eventId", count(*)::int AS cnt
            FROM registrations
            GROUP BY "eventId"
        )
        SELECT
            to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'MM') AS month,
            to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY') AS year,
            count(e.id)::int AS events,
            coalesce(sum(rc.cnt), 0)::int AS registrations
        FROM events e
        LEFT JOIN reg_counts rc ON rc."eventId" = e.id
        WHERE to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Madrid', 'YYYY') IN (
            to_char(${now}::timestamptz AT TIME ZONE 'Europe/Madrid', 'YYYY'),
            to_char((${now}::timestamptz - interval '1 year') AT TIME ZONE 'Europe/Madrid', 'YYYY')
        )
        GROUP BY 1, 2
        ORDER BY 2, 1
    `;

    const thisYear = String(now.getFullYear());
    const lastYear = String(now.getFullYear() - 1);
    const yearOverYear = {
        thisYear: yoyRows
            .filter((r) => r.year === thisYear)
            .map((r) => ({
                month: r.month,
                events: r.events,
                registrations: r.registrations,
            })),
        lastYear: yoyRows
            .filter((r) => r.year === lastYear)
            .map((r) => ({
                month: r.month,
                events: r.events,
                registrations: r.registrations,
            })),
    };

    // --- Tendencia: interés vs inscripción real por proyecto ---
    const interestVsRegistration = await prisma.$queryRaw<
        {
            id: string;
            name: string;
            color: string;
            interested: number;
            registered: number;
        }[]
    >`
        SELECT
            p.id,
            p.name,
            p.color,
            count(DISTINCT upp."userId")::int AS interested,
            count(DISTINCT r."userId")::int AS registered
        FROM projects p
        LEFT JOIN user_project_preferences upp ON upp."projectId" = p.id
        LEFT JOIN events e ON e."projectId" = p.id AND e."createdAt" >= ${windowStart}
        LEFT JOIN registrations r ON r."eventId" = e.id
        WHERE p.active = true
        GROUP BY p.id, p.name, p.color
        ORDER BY interested DESC
    `;

    // --- Tendencia: retención de AILs (repiten en 2+ eventos distintos) ---
    const retentionRows = await prisma.$queryRaw<
        { totalWithAtLeastOne: number; repeaters: number }[]
    >`
        WITH per_user AS (
            SELECT r."userId", count(*)::int AS cnt
            FROM registrations r
            JOIN users u ON u.id = r."userId"
            WHERE u."roleId" = 'ail'
            GROUP BY r."userId"
        )
        SELECT
            count(*)::int AS "totalWithAtLeastOne",
            count(*) FILTER (WHERE cnt >= 2)::int AS repeaters
        FROM per_user
    `;
    const retentionRow = retentionRows[0]!;
    const retentionPct =
        retentionRow.totalWithAtLeastOne === 0
            ? null
            : percent(
                  retentionRow.repeaters / retentionRow.totalWithAtLeastOne,
              );

    return {
        windowDays: days,
        incompleteProfiles,
        inactiveAilCount,
        signupsByMonth,
        roles,
        sensitiveActions,
        seriesVsSingle,
        avgLeadTimeDays,
        idleProjects,
        yearOverYear,
        interestVsRegistration,
        retention: {
            totalWithAtLeastOne: retentionRow.totalWithAtLeastOne,
            repeaters: retentionRow.repeaters,
            percent: retentionPct,
        },
    };
};
