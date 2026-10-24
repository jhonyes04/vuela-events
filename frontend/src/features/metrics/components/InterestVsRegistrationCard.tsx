import { type ReactNode } from 'react';
import { Bar, BarChart, LabelList, type BarShapeProps, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/stats/components/ChartCard';
import { groupFill } from '@/features/stats/components/chart-kit/shared';
import { contrastTextColor } from '@/features/projects/lib/colors';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

const INTEREST_CONFIG = {
    interested: { label: 'Interesados', color: 'var(--chart-2)' },
    registered: { label: 'Inscritos', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// Mezcla el color con blanco para la variante clara de "inscritos".
const lighten = (hex: string, amount: number): string => {
    const mix = (channel: number) =>
        Math.round(channel + (255 - channel) * amount);
    const r = mix(parseInt(hex.slice(1, 3), 16));
    const g = mix(parseInt(hex.slice(3, 5), 16));
    const b = mix(parseInt(hex.slice(5, 7), 16));

    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

// Número centrado en el segmento, con el color de texto que toque según el
// fondo de esa fila (cada proyecto tiene su propio color).
const SegmentLabel = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    value,
    fill,
}: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    value?: ReactNode;
    fill: string;
}) => (
    <text
        x={Number(x) + Number(width) / 2}
        y={Number(y) + Number(height) / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fill={fill}
    >
        {value}
    </text>
);

export const InterestVsRegistrationCard = ({ metrics }: { metrics: MetricsSummary }) => {
    const interestData = metrics.interestVsRegistration.map((p) => ({
        id: p.id,
        label: p.name,
        color: groupFill(p.color),
        interested: p.interested,
        registered: p.registered,
    }));

    return (
        <ChartCard
            title="Interés vs inscripción real por proyecto"
            empty={interestData.length === 0}
            className="lg:col-span-2"
        >
            <ChartContainer
                config={INTEREST_CONFIG}
                className="w-full"
                style={{
                    height: Math.min(480, Math.max(160, interestData.length * 44)),
                }}
            >
                <BarChart data={interestData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                        dataKey="label"
                        type="category"
                        width={160}
                        tickLine={false}
                        axisLine={false}
                    />
                    <ChartTooltip
                        cursor={{ fill: 'var(--muted)' }}
                        content={<ChartTooltipContent />}
                    />

                    <Bar
                        dataKey="interested"
                        name={INTEREST_CONFIG.interested.label}
                        stackId="interest"
                        shape={(props: BarShapeProps) => {
                            const { x, y, width, height, index } = props;
                            const color = interestData[index]?.color ?? '#ffffff';

                            return <rect x={x} y={y} width={width} height={height} fill={color} />;
                        }}
                    >
                        <LabelList
                            dataKey="interested"
                            position="center"
                            content={(props) => (
                                <SegmentLabel
                                    {...props}
                                    fill={contrastTextColor(
                                        interestData[Number(props.index)]?.color ?? '#ffffff',
                                    )}
                                />
                            )}
                        />
                    </Bar>
                    <Bar
                        dataKey="registered"
                        name={INTEREST_CONFIG.registered.label}
                        stackId="interest"
                        shape={(props: BarShapeProps) => {
                            const { x, y, width, height, index } = props;
                            const color = lighten(
                                interestData[index]?.color ?? '#ffffff',
                                0.5,
                            );

                            return <rect x={x} y={y} width={width} height={height} fill={color} />;
                        }}
                    >
                        <LabelList
                            dataKey="registered"
                            position="center"
                            content={(props) => (
                                <SegmentLabel
                                    {...props}
                                    fill={contrastTextColor(
                                        lighten(
                                            interestData[Number(props.index)]?.color ?? '#ffffff',
                                            0.5,
                                        ),
                                    )}
                                />
                            )}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        </ChartCard>
    );
};
