import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';
import {
    CalendarDays,
    Gauge,
    Ticket,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CATEGORY_HEX,
    type CategoryColor,
} from '@/features/categories/lib/colors';
import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    formatStatsDate,
    getStats,
    monthLabel,
    quarterLabel,
    type SeriesPoint,
    type StatsGroup,
    type StatsSummary,
} from '@/features/stats/lib/stats';

// Cada tipo de estadística es una sola sección: el selector muestra una a la vez.
const SECTIONS = [
    { id: 'events-month', label: 'Por mes', group: 'Eventos' },
    { id: 'events-quarter', label: 'Por trimestre', group: 'Eventos' },
    { id: 'events-year', label: 'Por año', group: 'Eventos' },
    {
        id: 'events-status',
        label: 'Estado (pasados, en curso, próximos)',
        group: 'Eventos',
    },
    { id: 'events-category', label: 'Por categoría', group: 'Eventos' },
    { id: 'events-guide', label: 'Por guía', group: 'Eventos' },
    { id: 'reg-month', label: 'Inscripciones por mes', group: 'Inscripciones' },
    {
        id: 'reg-category',
        label: 'Inscripciones por categoría',
        group: 'Inscripciones',
    },
    {
        id: 'reg-top-events',
        label: 'Eventos con más inscritos',
        group: 'Inscripciones',
    },
    { id: 'occupancy', label: 'Ocupación', group: 'Ocupación' },
    { id: 'users-top', label: 'Usuarios más activos', group: 'Usuarios' },
    { id: 'attended-month', label: 'Atendidos por mes', group: 'Atendidos' },
    {
        id: 'attended-quarter',
        label: 'Atendidos por trimestre',
        group: 'Atendidos',
    },
    { id: 'attended-year', label: 'Atendidos por año', group: 'Atendidos' },
    { id: 'attended-total', label: 'Atendidos en total', group: 'Atendidos' },
    {
        id: 'attended-category',
        label: 'Atendidos por categoría',
        group: 'Atendidos',
    },
    {
        id: 'pending',
        label: 'Finalizados sin dato de atendidos',
        group: 'Pendientes',
    },
] as const;

const GROUP_ORDER = [
    'Eventos',
    'Inscripciones',
    'Ocupación',
    'Usuarios',
    'Atendidos',
    'Pendientes',
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type GroupId = (typeof GROUP_ORDER)[number];

const countConfig = (label: string, color: string): ChartConfig => ({
    count: { label, color },
});

const valueConfig = (label: string, color: string): ChartConfig => ({
    value: { label, color },
});

const STATUS_CONFIG = {
    past: { label: 'Finalizados', color: 'var(--chart-4)' },
    ongoing: { label: 'En curso', color: 'var(--chart-2)' },
    future: { label: 'Próximos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// Las categorías llevan su color; los grupos sin color (guías) usan el de la gráfica.
const groupFill = (color: string | null): string =>
    color && color in CATEGORY_HEX
        ? CATEGORY_HEX[color as CategoryColor]
        : 'var(--color-value)';

const initials = (name: string): string =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

const percentOf = (part: number, total: number): number =>
    total === 0 ? 0 : Math.round((part / total) * 100);

// Mini gráfica de fondo de cada KPI: la tendencia mensual.
const Sparkline = ({ data, color }: { data: SeriesPoint[]; color: string }) => {
    const config = { count: { label: 'Total', color } } satisfies ChartConfig;

    return (
        <ChartContainer config={config} className="h-16 w-full">
            <AreaChart
                data={data.map((p) => ({ count: p.count }))}
                margin={{ top: 4, left: 0, right: 0, bottom: 0 }}
            >
                <Area
                    dataKey="count"
                    type="monotone"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ChartContainer>
    );
};

const Kpi = ({
    icon: Icon,
    label,
    value,
    series,
    color,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    series?: SeriesPoint[];
    color?: string;
}) => (
    <Card className="relative gap-0 overflow-hidden border-0 py-0 shadow-sm ring-1 ring-foreground/5">
        <div className="grid gap-1 p-5">
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Icon className="size-4" />
                {label}
            </span>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {value}
            </p>
        </div>
        {series && series.length > 1 && color && (
            <Sparkline data={series} color={color} />
        )}
    </Card>
);

// Área con degradado para series mensuales.
const AreaSeries = ({
    id,
    data,
    config,
    labelOf,
}: {
    id: string;
    data: SeriesPoint[];
    config: ChartConfig;
    labelOf: (key: string) => string;
}) => (
    <ChartContainer config={config} className="h-72 w-full">
        <AreaChart
            data={data.map((p) => ({ label: labelOf(p.key), count: p.count }))}
            margin={{ top: 8, left: 0, right: 8 }}
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0%"
                        stopColor="var(--color-count)"
                        stopOpacity={0.35}
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--color-count)"
                        stopOpacity={0}
                    />
                </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
            />
            <YAxis
                allowDecimals={false}
                width={32}
                tickLine={false}
                axisLine={false}
            />
            <ChartTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={<ChartTooltipContent />}
            />
            <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2.5}
                fill={`url(#${id})`}
            />
        </AreaChart>
    </ChartContainer>
);

// Barras verticales redondeadas con el valor encima (trimestre, año).
const BarSeries = ({
    data,
    config,
    labelOf,
}: {
    data: SeriesPoint[];
    config: ChartConfig;
    labelOf: (key: string) => string;
}) => (
    <ChartContainer config={config} className="h-72 w-full">
        <BarChart
            data={data.map((p) => ({ label: labelOf(p.key), count: p.count }))}
            margin={{ top: 16, left: 0, right: 8 }}
        >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
            />
            <YAxis
                allowDecimals={false}
                width={32}
                tickLine={false}
                axisLine={false}
            />
            <ChartTooltip
                cursor={{ fill: 'var(--muted)' }}
                content={<ChartTooltipContent />}
            />
            <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[6, 6, 0, 0]}
                maxBarSize={56}
            >
                <LabelList
                    dataKey="count"
                    position="top"
                    fontSize={12}
                    className="fill-muted-foreground"
                />
            </Bar>
        </BarChart>
    </ChartContainer>
);

// Barras horizontales finas por grupo, con el color de la categoría y el valor al final.
const HorizontalBars = ({
    data,
    metric,
    config,
}: {
    data: StatsGroup[];
    metric: 'events' | 'registrations' | 'attended';
    config: ChartConfig;
}) => (
    <ChartContainer config={config} className="h-72 w-full">
        <BarChart
            data={data.map((g) => ({ label: g.name, value: g[metric] }))}
            layout="vertical"
            margin={{ left: 8, right: 32 }}
        >
            <XAxis type="number" hide />
            <YAxis
                dataKey="label"
                type="category"
                width={140}
                tickLine={false}
                axisLine={false}
            />
            <ChartTooltip
                cursor={{ fill: 'var(--muted)' }}
                content={<ChartTooltipContent />}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                {data.map((g) => (
                    <Cell key={g.id} fill={groupFill(g.color)} />
                ))}
                <LabelList
                    dataKey="value"
                    position="right"
                    fontSize={12}
                    className="fill-muted-foreground"
                />
            </Bar>
        </BarChart>
    </ChartContainer>
);

// Donut con el total en el centro y leyenda con porcentajes.
const StatusDonut = ({ stats }: { stats: StatsSummary }) => {
    const items = [
        {
            key: 'past',
            value: stats.eventsByStatus.past,
            dot: 'bg-[var(--chart-4)]',
        },
        {
            key: 'ongoing',
            value: stats.eventsByStatus.ongoing,
            dot: 'bg-[var(--chart-2)]',
        },
        {
            key: 'future',
            value: stats.eventsByStatus.future,
            dot: 'bg-[var(--chart-1)]',
        },
    ] as const;
    const total = items.reduce((sum, i) => sum + i.value, 0);

    return (
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
            <div className="relative">
                <ChartContainer
                    config={STATUS_CONFIG}
                    className="mx-auto h-64 w-full"
                >
                    <PieChart>
                        <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={items.map((i) => ({
                                name: i.key,
                                value: i.value,
                                fill: `var(--color-${i.key})`,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={68}
                            outerRadius={100}
                            paddingAngle={3}
                            stroke="none"
                        />
                    </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="text-3xl font-semibold tabular-nums">
                            {total}
                        </p>
                        <p className="text-xs text-muted-foreground">eventos</p>
                    </div>
                </div>
            </div>
            <ul className="grid gap-4">
                {items.map((i) => (
                    <li
                        key={i.key}
                        className="flex items-center justify-between gap-3 text-sm"
                    >
                        <span className="flex items-center gap-2.5">
                            <span
                                className={`size-2.5 rounded-full ${i.dot}`}
                            />
                            {STATUS_CONFIG[i.key].label}
                        </span>
                        <span className="font-semibold tabular-nums">
                            {i.value}{' '}
                            <span className="font-normal text-muted-foreground">
                                ({percentOf(i.value, total)}%)
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface RankRow {
    id: string;
    title: string;
    meta: string;
    value?: string;
    progress?: number;
    leading?: string;
}

// Lista limpia: avatar opcional, título, detalle y una píldora con el valor.
const RankList = ({ rows }: { rows: RankRow[] }) => (
    <ul className="grid divide-y">
        {rows.map((r) => (
            <li
                key={r.id}
                className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
                <div className="flex min-w-0 items-center gap-3">
                    {r.leading && (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-semibold text-brand-ink">
                            {r.leading}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {r.meta}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {r.progress !== undefined && (
                        <Progress value={r.progress} className="w-32" />
                    )}
                    {r.value !== undefined && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums">
                            {r.value}
                        </span>
                    )}
                </div>
            </li>
        ))}
    </ul>
);

export const StatsPage = () => {
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [failed, setFailed] = useState(false);
    const [group, setGroup] = useState<GroupId>('Eventos');
    const [section, setSection] = useState<SectionId>('events-month');

    const groupSections = SECTIONS.filter((s) => s.group === group);

    // Al cambiar de tipo, el subtipo vuelve a su primera vista.
    const changeGroup = (value: GroupId) => {
        const first = SECTIONS.find((s) => s.group === value);

        setGroup(value);

        if (first) setSection(first.id);
    };

    useEffect(() => {
        getStats()
            .then(setStats)
            .catch(() => setFailed(true));
    }, []);

    if (failed) {
        return (
            <p className="text-sm text-destructive">
                No se pudieron cargar las estadísticas.
            </p>
        );
    }

    if (!stats) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Cargando estadísticas…
            </p>
        );
    }

    const averageRate =
        stats.occupancy.averageRate === null
            ? '—'
            : `${stats.occupancy.averageRate} %`;

    return (
        <section className="mx-auto grid w-full max-w-6xl gap-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid gap-1">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Estadísticas
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Eventos, inscripciones y personas atendidas.
                    </p>
                </div>
                <div className="grid gap-3 sm:w-[28rem] sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="stats-group"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Tipo
                        </Label>
                        <Select
                            value={group}
                            items={GROUP_ORDER.map((g) => ({
                                value: g,
                                label: g,
                            }))}
                            onValueChange={(value) =>
                                value && changeGroup(value as GroupId)
                            }
                        >
                            <SelectTrigger
                                id="stats-group"
                                className="w-full bg-card"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {GROUP_ORDER.map((g) => (
                                    <SelectItem key={g} value={g} label={g}>
                                        {g}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {groupSections.length > 1 && (
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="stats-section"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Estadística
                            </Label>
                            <Select
                                value={section}
                                items={groupSections.map((s) => ({
                                    value: s.id,
                                    label: s.label,
                                }))}
                                onValueChange={(value) =>
                                    value && setSection(value as SectionId)
                                }
                            >
                                <SelectTrigger
                                    id="stats-section"
                                    className="w-full bg-card"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {groupSections.map((s) => (
                                        <SelectItem
                                            key={s.id}
                                            value={s.id}
                                            label={s.label}
                                        >
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                    icon={CalendarDays}
                    label="Eventos"
                    value={String(stats.totals.events)}
                    series={stats.eventsByMonth}
                    color="var(--chart-1)"
                />
                <Kpi
                    icon={Ticket}
                    label="Inscripciones"
                    value={String(stats.totals.registrations)}
                    series={stats.registrationsByMonth}
                    color="var(--chart-2)"
                />
                <Kpi
                    icon={Users}
                    label="Atendidos"
                    value={String(stats.totals.attended)}
                    series={stats.attendedByMonth}
                    color="var(--chart-3)"
                />
                <Kpi icon={Gauge} label="Ocupación media" value={averageRate} />
            </div>

            <div className="grid gap-6">
                {section === 'events-month' && (
                    <ChartCard
                        title="Eventos por mes"
                        empty={stats.eventsByMonth.length === 0}
                    >
                        <AreaSeries
                            id="grad-events-month"
                            data={stats.eventsByMonth}
                            config={countConfig('Eventos', 'var(--chart-1)')}
                            labelOf={monthLabel}
                        />
                    </ChartCard>
                )}

                {section === 'events-quarter' && (
                    <ChartCard
                        title="Eventos por trimestre"
                        empty={stats.eventsByQuarter.length === 0}
                    >
                        <BarSeries
                            data={stats.eventsByQuarter}
                            config={countConfig('Eventos', 'var(--chart-1)')}
                            labelOf={quarterLabel}
                        />
                    </ChartCard>
                )}

                {section === 'events-year' && (
                    <ChartCard
                        title="Eventos por año"
                        empty={stats.eventsByYear.length === 0}
                    >
                        <BarSeries
                            data={stats.eventsByYear}
                            config={countConfig('Eventos', 'var(--chart-1)')}
                            labelOf={(key) => key}
                        />
                    </ChartCard>
                )}

                {section === 'events-status' && (
                    <ChartCard
                        title="Estado de los eventos"
                        description="Pasados, en curso y próximos."
                        empty={stats.totals.events === 0}
                    >
                        <StatusDonut stats={stats} />
                    </ChartCard>
                )}

                {section === 'events-category' && (
                    <ChartCard
                        title="Eventos por categoría"
                        empty={stats.eventsByCategory.length === 0}
                    >
                        <HorizontalBars
                            data={stats.eventsByCategory}
                            metric="events"
                            config={valueConfig('Eventos', 'var(--chart-1)')}
                        />
                    </ChartCard>
                )}

                {section === 'events-guide' && (
                    <ChartCard
                        title="Eventos por guía"
                        empty={stats.eventsByGuide.length === 0}
                    >
                        <HorizontalBars
                            data={stats.eventsByGuide}
                            metric="events"
                            config={valueConfig('Eventos', 'var(--chart-1)')}
                        />
                    </ChartCard>
                )}

                {section === 'reg-month' && (
                    <ChartCard
                        title="Inscripciones por mes"
                        empty={stats.registrationsByMonth.length === 0}
                    >
                        <AreaSeries
                            id="grad-reg-month"
                            data={stats.registrationsByMonth}
                            config={countConfig(
                                'Inscripciones',
                                'var(--chart-2)',
                            )}
                            labelOf={monthLabel}
                        />
                    </ChartCard>
                )}

                {section === 'reg-category' && (
                    <ChartCard
                        title="Inscripciones por categoría"
                        empty={stats.registrationsByCategory.length === 0}
                    >
                        <HorizontalBars
                            data={stats.registrationsByCategory}
                            metric="registrations"
                            config={valueConfig(
                                'Inscripciones',
                                'var(--chart-2)',
                            )}
                        />
                    </ChartCard>
                )}

                {section === 'reg-top-events' && (
                    <ChartCard
                        title="Eventos con más inscritos"
                        empty={stats.topEvents.length === 0}
                    >
                        <RankList
                            rows={stats.topEvents.map((e) => ({
                                id: e.id,
                                title: e.title,
                                meta: formatStatsDate(e.startsAt),
                                value: String(e.registrations),
                            }))}
                        />
                    </ChartCard>
                )}

                {section === 'occupancy' && (
                    <ChartCard
                        title="Ocupación"
                        description="Inscritos frente al aforo, de más a menos llenos."
                        empty={stats.occupancyEvents.length === 0}
                    >
                        <div className="grid gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Kpi
                                    icon={Gauge}
                                    label="Ocupación media"
                                    value={averageRate}
                                />
                                <Kpi
                                    icon={Ticket}
                                    label="Completos"
                                    value={String(stats.occupancy.fullEvents)}
                                />
                            </div>
                            <RankList
                                rows={stats.occupancyEvents.map((e) => {
                                    const rate = percentOf(
                                        e.registrations,
                                        e.capacity,
                                    );

                                    return {
                                        id: e.id,
                                        title: e.title,
                                        meta: `${formatStatsDate(e.startsAt)} · ${e.registrations} de ${e.capacity} plazas`,
                                        value: `${rate} %`,
                                        progress: Math.min(rate, 100),
                                    };
                                })}
                            />
                        </div>
                    </ChartCard>
                )}

                {section === 'users-top' && (
                    <ChartCard
                        title="Usuarios más activos"
                        description="Por número de inscripciones."
                        empty={stats.topUsers.length === 0}
                    >
                        <RankList
                            rows={stats.topUsers.map((u) => ({
                                id: u.id,
                                title: u.name,
                                meta: u.puntoVuela ?? 'Sin Punto Vuela',
                                value: String(u.registrations),
                                leading: initials(u.name),
                            }))}
                        />
                        <p className="mt-4 text-sm text-muted-foreground">
                            Usuarios activos sin ninguna inscripción:{' '}
                            <strong className="text-foreground">
                                {stats.usersWithoutRegistrations}
                            </strong>
                        </p>
                    </ChartCard>
                )}

                {section === 'attended-month' && (
                    <ChartCard
                        title="Atendidos por mes"
                        empty={stats.attendedByMonth.length === 0}
                    >
                        <AreaSeries
                            id="grad-attended-month"
                            data={stats.attendedByMonth}
                            config={countConfig('Atendidos', 'var(--chart-3)')}
                            labelOf={monthLabel}
                        />
                    </ChartCard>
                )}

                {section === 'attended-quarter' && (
                    <ChartCard
                        title="Atendidos por trimestre"
                        empty={stats.attendedByQuarter.length === 0}
                    >
                        <BarSeries
                            data={stats.attendedByQuarter}
                            config={countConfig('Atendidos', 'var(--chart-3)')}
                            labelOf={quarterLabel}
                        />
                    </ChartCard>
                )}

                {section === 'attended-category' && (
                    <ChartCard
                        title="Atendidos por categoría"
                        empty={stats.attendedByCategory.length === 0}
                    >
                        <HorizontalBars
                            data={stats.attendedByCategory}
                            metric="attended"
                            config={valueConfig('Atendidos', 'var(--chart-3)')}
                        />
                    </ChartCard>
                )}

                {section === 'attended-year' && (
                    <ChartCard
                        title="Atendidos por año"
                        empty={stats.attendedByYear.length === 0}
                    >
                        <BarSeries
                            data={stats.attendedByYear}
                            config={countConfig('Atendidos', 'var(--chart-3)')}
                            labelOf={(key) => key}
                        />
                    </ChartCard>
                )}

                {section === 'attended-total' && (
                    <ChartCard
                        title="Atendidos en total"
                        description="Suma de los datos de atendidos de todos los eventos."
                        empty={stats.totals.attended === 0}
                    >
                        <div className="grid place-items-center gap-2 py-8">
                            <p className="text-6xl font-semibold tracking-tight tabular-nums">
                                {stats.totals.attended}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                personas atendidas
                            </p>
                        </div>
                    </ChartCard>
                )}

                {section === 'pending' && (
                    <ChartCard
                        title="Finalizados sin dato de atendidos"
                        description={`${stats.finishedWithoutAttended.count} evento(s) pendientes de rellenar.`}
                        empty={stats.finishedWithoutAttended.count === 0}
                    >
                        <RankList
                            rows={stats.finishedWithoutAttended.events.map(
                                (e) => ({
                                    id: e.id,
                                    title: e.title,
                                    meta: formatStatsDate(e.startsAt),
                                }),
                            )}
                        />
                    </ChartCard>
                )}
            </div>
        </section>
    );
};
