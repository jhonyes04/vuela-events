import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { groupFill, type NamedGroup } from './shared';

// Barras horizontales finas por grupo, con el color de la categoría y el valor al final.
// Altura según nº de filas: con pocas categorías, h-72 fijo dejaba huecos enormes entre barras.
export const HorizontalBars = <T extends NamedGroup>({
    data,
    metric,
    config,
    maxHeight = 288,
}: {
    data: T[];
    metric: keyof Omit<T, 'id' | 'name' | 'color'>;
    config: ChartConfig;
    maxHeight?: number;
}) => {
    // Las filas en 0 no aportan nada al verlas y ocupan espacio igual.
    const rows = data.filter((g) => Number(g[metric]) !== 0);

    return (
        <ChartContainer
            config={config}
            className="w-full"
            style={{ height: Math.min(maxHeight, Math.max(120, rows.length * 44)) }}
        >
            <BarChart
                data={rows.map((g) => ({ label: g.name, value: Number(g[metric]) }))}
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
                <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                    minPointSize={3}
                >
                    {rows.map((g) => (
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
};
