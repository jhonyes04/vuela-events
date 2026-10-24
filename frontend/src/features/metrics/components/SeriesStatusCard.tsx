import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/stats/components/ChartCard';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

const SERIES_CONFIG = {
    series: { label: 'En serie', color: 'var(--chart-1)' },
    single: { label: 'Sueltas', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export const SeriesStatusCard = ({ metrics }: { metrics: MetricsSummary }) => {
    const seriesStatusData = [
        {
            label: 'No terminados',
            series: metrics.seriesVsSingle.ongoing.series,
            single: metrics.seriesVsSingle.ongoing.single,
        },
        {
            label: 'Terminados',
            series: metrics.seriesVsSingle.finished.series,
            single: metrics.seriesVsSingle.finished.single,
        },
    ];
    const totalEvents =
        metrics.seriesVsSingle.ongoing.series +
        metrics.seriesVsSingle.ongoing.single +
        metrics.seriesVsSingle.finished.series +
        metrics.seriesVsSingle.finished.single;

    return (
        <ChartCard
            title="Series recurrentes vs sesiones sueltas"
            description="Terminados y no terminados, por separado"
            empty={totalEvents === 0}
        >
            <ChartContainer config={SERIES_CONFIG} className="h-64 w-full">
                <BarChart data={seriesStatusData} margin={{ top: 16, left: 0, right: 8 }}>
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
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                        dataKey="series"
                        name={SERIES_CONFIG.series.label}
                        fill="var(--color-series)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                    />
                    <Bar
                        dataKey="single"
                        name={SERIES_CONFIG.single.label}
                        fill="var(--color-single)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                    />
                </BarChart>
            </ChartContainer>
        </ChartCard>
    );
};
