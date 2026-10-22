import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';

interface OccupancyRow {
    id: string;
    title: string;
    meta: string;
    rate: number;
}

const OccupancyTick = ({
    x = 0,
    y = 0,
    payload,
    rows,
}: {
    x?: number | string;
    y?: number | string;
    payload?: { value?: string };
    rows: OccupancyRow[];
}) => {
    const row = rows.find((r) => r.id === payload?.value);

    if (!row) return null;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={-8}
                y={-3}
                textAnchor="end"
                fontSize={12}
                className="fill-foreground font-medium"
            >
                {row.title}
            </text>
            <text
                x={-8}
                y={11}
                textAnchor="end"
                fontSize={11}
                className="fill-muted-foreground"
            >
                {row.meta}
            </text>
        </g>
    );
};

// Barra horizontal de progreso: fondo = aforo completo, relleno = % ocupado.
// Cada fila lleva evento + fecha/plazas en dos líneas, como el RankList.
export const OccupancyBars = ({ rows }: { rows: OccupancyRow[] }) => {
    const config = {
        rate: { label: 'Ocupación', color: '#f59e0b' },
    } satisfies ChartConfig;

    return (
        <ChartContainer
            config={config}
            className="w-full"
            style={{ height: Math.max(140, rows.length * 52) }}
        >
            <BarChart
                data={rows.map((r) => ({ id: r.id, rate: r.rate }))}
                layout="vertical"
                margin={{ left: 8, right: 40 }}
            >
                <XAxis
                    type="number"
                    domain={[0, (max: number) => Math.max(100, max)]}
                    hide
                />
                <YAxis
                    dataKey="id"
                    type="category"
                    width={190}
                    tickLine={false}
                    axisLine={false}
                    tick={(props) => <OccupancyTick {...props} rows={rows} />}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            labelFormatter={(id) =>
                                rows.find((r) => r.id === id)?.title ?? ''
                            }
                        />
                    }
                />
                <Bar
                    dataKey="rate"
                    fill="var(--color-rate)"
                    radius={6}
                    barSize={16}
                    minPointSize={3}
                    background={{ fill: 'var(--muted)', radius: 6 }}
                >
                    <LabelList
                        dataKey="rate"
                        position="right"
                        formatter={(v) => `${v} %`}
                        fontSize={12}
                        className="fill-muted-foreground"
                    />
                </Bar>
            </BarChart>
        </ChartContainer>
    );
};
