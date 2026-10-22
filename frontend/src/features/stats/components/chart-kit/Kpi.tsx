import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, XAxis } from 'recharts';
import { monthLabel } from '@/features/stats/lib/stats';
import type { SeriesPoint } from '@/features/stats/lib/stats';

// Mini gráfica de fondo de cada KPI: la tendencia mensual.
const Sparkline = ({ data, color }: { data: SeriesPoint[]; color: string }) => {
    const config = { count: { label: 'Total', color } } satisfies ChartConfig;

    return (
        <ChartContainer config={config} className="h-16 w-full">
            <AreaChart
                data={data.map((p) => ({
                    label: monthLabel(p.key),
                    count: p.count,
                }))}
                margin={{ top: 4, left: 0, right: 0, bottom: 0 }}
            >
                <XAxis dataKey="label" hide />
                <ChartTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={<ChartTooltipContent />}
                />
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
