import type { ReactNode } from 'react';
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
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import {
    PROJECT_HEX,
    type ProjectColor,
} from '@/features/projects/lib/colors';
import type { SeriesPoint, StatsSummary } from '@/features/stats/lib/stats';

export const countConfig = (label: string, color: string): ChartConfig => ({
    count: { label, color },
});

export const valueConfig = (label: string, color: string): ChartConfig => ({
    value: { label, color },
});

const STATUS_CONFIG = {
    past: { label: 'Finalizados', color: 'var(--chart-4)' },
    ongoing: { label: 'En curso', color: 'var(--chart-2)' },
    future: { label: 'Próximos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// Los proyectos llevan su color; los grupos sin color (guías) usan el de la gráfica.
const groupFill = (color: string | null): string =>
    color && color in PROJECT_HEX
        ? PROJECT_HEX[color as ProjectColor]
        : 'var(--color-value)';

export const initials = (name: string): string =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

export const percentOf = (part: number, total: number): number =>
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

export const Kpi = ({
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
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {value}
            </p>
        </div>
        {series && series.length > 1 && color && (
            <Sparkline data={series} color={color} />
        )}
    </Card>
);

// Área con degradado para series mensuales.
export const AreaSeries = ({
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
                minTickGap={12}
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
export const BarSeries = ({
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
                minTickGap={12}
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

interface NamedGroup {
    id: string;
    name: string;
    color: string | null;
}

// Barras horizontales finas por grupo, con el color de la categoría y el valor al final.
// Altura según nº de filas: con pocas categorías, h-72 fijo dejaba huecos enormes entre barras.
export const HorizontalBars = <T extends NamedGroup>({
    data,
    metric,
    config,
}: {
    data: T[];
    metric: keyof Omit<T, 'id' | 'name' | 'color'>;
    config: ChartConfig;
}) => (
    <ChartContainer
        config={config}
        className="w-full"
        style={{ height: Math.min(288, Math.max(120, data.length * 44)) }}
    >
        <BarChart
            data={data.map((g) => ({ label: g.name, value: Number(g[metric]) }))}
            layout="vertical"
            margin={{ left: 8, right: 32 }}
        >
            <XAxis type="number" hide />
            <YAxis
                dataKey="label"
                type="category"
                width={120}
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
export const StatusDonut = ({ stats }: { stats: StatsSummary }) => {
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
                        <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
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

export interface RankRow {
    id: string;
    title: string;
    meta: string;
    value?: string;
    progress?: number;
    leading?: string;
    action?: ReactNode;
}

// Lista limpia: avatar opcional, título, detalle y una píldora con el valor.
export const RankList = ({ rows }: { rows: RankRow[] }) => (
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
                        <Progress value={r.progress} className="w-24 sm:w-32" />
                    )}
                    {r.value !== undefined && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums">
                            {r.value}
                        </span>
                    )}
                    {r.action}
                </div>
            </li>
        ))}
    </ul>
);
