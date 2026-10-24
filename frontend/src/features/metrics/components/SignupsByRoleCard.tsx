import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/stats/components/ChartCard';
import { monthLabel } from '@/features/stats/lib/stats';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

// Hay como mucho 5 tonos de gráfica definidos; con más roles que colores, se
// repiten en ciclo en vez de romper.
const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export const SignupsByRoleCard = ({ metrics }: { metrics: MetricsSummary }) => {
    const months = [
        ...new Set(metrics.signupsByMonth.map((r) => r.month)),
    ].sort();

    const roleConfig = Object.fromEntries(
        metrics.roles.map((role, i) => [
            role.id,
            { label: role.name, color: CHART_COLORS[i % CHART_COLORS.length] },
        ]),
    ) satisfies ChartConfig;

    const signupsData = months.map((m) => {
        const row: Record<string, string | number> = { label: monthLabel(m) };

        for (const role of metrics.roles) {
            row[role.id] =
                metrics.signupsByMonth.find(
                    (s) => s.month === m && s.roleId === role.id,
                )?.count ?? 0;
        }

        return row;
    });

    return (
        <ChartCard
            title="Altas por mes y rol"
            description="En la ventana elegida"
            empty={signupsData.length === 0}
        >
            <ChartContainer config={roleConfig} className="h-72 w-full">
                <BarChart data={signupsData} margin={{ top: 16, left: 0, right: 8 }}>
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
                    {metrics.roles.map((role) => (
                        <Bar
                            key={role.id}
                            dataKey={role.id}
                            name={role.name}
                            fill={`var(--color-${role.id})`}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                        >
                            <LabelList
                                dataKey={role.id}
                                position="top"
                                fontSize={12}
                                className="fill-muted-foreground"
                            />
                        </Bar>
                    ))}
                </BarChart>
            </ChartContainer>
        </ChartCard>
    );
};
