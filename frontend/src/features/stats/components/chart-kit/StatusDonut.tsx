import { Pie, PieChart } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { percentOf } from '@/features/stats/lib/chartHelpers';
import type { StatsSummary } from '@/features/stats/lib/stats';

const STATUS_CONFIG = {
    past: { label: 'Finalizados', color: 'var(--chart-4)' },
    ongoing: { label: 'En curso', color: 'var(--chart-2)' },
    future: { label: 'Próximos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

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
    // Un estado en 0 no aporta nada al verlo ni en el donut ni en la leyenda.
    const visibleItems = items.filter((i) => i.value !== 0);

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
                            data={visibleItems.map((i) => ({
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
                {visibleItems.map((i) => (
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
