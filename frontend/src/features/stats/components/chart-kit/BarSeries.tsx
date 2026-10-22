import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { SeriesPoint } from '@/features/stats/lib/stats';

// Barras verticales redondeadas con el valor encima (trimestre, año). Los
// puntos en 0 no aportan nada al verlos y recargan el eje, así que se omiten.
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
            data={data
                .filter((p) => p.count !== 0)
                .map((p) => ({ label: labelOf(p.key), count: p.count }))}
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
