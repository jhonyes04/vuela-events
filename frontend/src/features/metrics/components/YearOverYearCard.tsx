import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
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

const YOY_CONFIG = {
    thisYear: { label: 'Este año', color: 'var(--chart-1)' },
    lastYear: { label: 'Año pasado', color: 'var(--chart-4)' },
} satisfies ChartConfig;

// "03" -> "mar"
const shortMonthLabel = (mm: string): string =>
    new Date(2000, Number(mm) - 1, 1).toLocaleDateString('es-ES', {
        month: 'short',
    });

interface YearOverYearCardProps {
    title: string;
    metrics: MetricsSummary;
    field: 'events' | 'registrations';
}

export const YearOverYearCard = ({ title, metrics, field }: YearOverYearCardProps) => {
    const months = [
        ...new Set([
            ...metrics.yearOverYear.thisYear.map((r) => r.month),
            ...metrics.yearOverYear.lastYear.map((r) => r.month),
        ]),
    ].sort();

    const data = months.map((m) => ({
        label: shortMonthLabel(m),
        thisYear: metrics.yearOverYear.thisYear.find((r) => r.month === m)?.[field] ?? 0,
        lastYear: metrics.yearOverYear.lastYear.find((r) => r.month === m)?.[field] ?? 0,
    }));

    return (
        <ChartCard title={title} empty={data.length === 0}>
            <ChartContainer config={YOY_CONFIG} className="h-64 w-full">
                <LineChart data={data} margin={{ top: 16, left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                    />
                    <YAxis
                        allowDecimals={false}
                        width={28}
                        tickLine={false}
                        axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                        dataKey="lastYear"
                        name={YOY_CONFIG.lastYear.label}
                        stroke="var(--color-lastYear)"
                        strokeDasharray="4 3"
                        strokeWidth={2}
                        dot={false}
                    />
                    <Line
                        dataKey="thisYear"
                        name={YOY_CONFIG.thisYear.label}
                        stroke="var(--color-thisYear)"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                    />
                </LineChart>
            </ChartContainer>
        </ChartCard>
    );
};
