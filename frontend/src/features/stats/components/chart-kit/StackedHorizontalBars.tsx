import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { contrastTextColor } from '@/features/projects/lib/colors';
import type { UserParticipationSummary } from '@/features/stats/lib/stats';
import { groupFill } from './shared';

// Barras horizontales apiladas: una fila por participante, un segmento de
// color por proyecto. Sustituye al ranking + selector de proyecto.
export const StackedHorizontalBars = ({
    rows,
    projects,
}: {
    rows: UserParticipationSummary['rows'];
    projects: UserParticipationSummary['projects'];
}) => {
    const config = Object.fromEntries(
        projects.map((p) => [
            p.id,
            { label: p.name, color: groupFill(p.color) },
        ]),
    ) satisfies ChartConfig;

    const data = rows.map((row) => ({
        label: row.puntoVuela ?? 'Sin Punto Vuela',
        ...row.byProject,
    }));

    return (
        <ChartContainer
            config={config}
            className="w-full"
            style={{ height: Math.min(480, Math.max(160, rows.length * 40)) }}
        >
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide allowDecimals={false} />
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
                <ChartLegend content={<ChartLegendContent />} />
                {projects.map((p) => (
                    <Bar
                        key={p.id}
                        dataKey={p.id}
                        name={p.name}
                        stackId="participations"
                        fill={groupFill(p.color)}
                    >
                        <LabelList
                            dataKey={p.id}
                            position="center"
                            fontSize={12}
                            fill={contrastTextColor(groupFill(p.color))}
                        />
                    </Bar>
                ))}
            </BarChart>
        </ChartContainer>
    );
};
