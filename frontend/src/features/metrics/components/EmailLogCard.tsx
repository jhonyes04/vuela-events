import { type ReactNode } from 'react';
import {
    Bar,
    BarChart,
    LabelList,
    type BarShapeProps,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    SLOT_LABELS,
    type SlotId,
} from '@/features/appSettings/lib/emailSettings';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';
import { contrastTextColor } from '@/features/projects/lib/colors';

const OK_COLOR = '#16a34a';
const FAILED_COLOR = '#dc2626';

const lighten = (hex: string, amount: number): string => {
    const mix = (channel: number) =>
        Math.round(channel + (255 - channel) * amount);
    const r = mix(parseInt(hex.slice(1, 3), 16));
    const g = mix(parseInt(hex.slice(3, 5), 16));
    const b = mix(parseInt(hex.slice(5, 7), 16));

    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

const EMAIL_LOG_CONFIG = {
    ok: { label: 'Correctos', color: OK_COLOR },
    failed: { label: 'Erróneos', color: FAILED_COLOR },
} satisfies ChartConfig;

const ORIGIN_LABELS: Record<string, string> = {
    system: 'Sistema',
    user: 'Usuario',
};

// Número centrado en el segmento
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

export const EmailLogCard = ({ metrics }: { metrics: MetricsSummary }) => {
    const { total, bySlot } = metrics.emailLog;

    const emailLogData = bySlot.map((row) => {
        const rowTotal = row.ok + row.failed;

        return {
            id: `${row.slot ?? 'sin-slot'}-${row.origin}`,
            label: `${SLOT_LABELS[row.slot as SlotId] ?? row.slot ?? 'Sin slot'} · ${ORIGIN_LABELS[row.origin] ?? row.origin}`,
            origin: row.origin,
            ok: row.ok,
            failed: row.failed,
            okPct: (row.ok / rowTotal) * 100,
            failedPct: (row.failed / rowTotal) * 100,
        };
    });

    return (
        <ChartCard
            title="Emails enviados"
            description={`${total.ok} correctos, ${total.failed} erróneos`}
            empty={emailLogData.length === 0}
            className="lg:col-span-2"
        >
            <ChartContainer
                config={EMAIL_LOG_CONFIG}
                className="w-full"
                style={{
                    height: Math.min(
                        480,
                        Math.max(160, emailLogData.length * 44),
                    ),
                }}
            >
                <BarChart
                    data={emailLogData}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                        dataKey="label"
                        type="category"
                        width={220}
                        tickLine={false}
                        axisLine={false}
                    />
                    <ChartTooltip
                        cursor={{ fill: 'var(--muted)' }}
                        content={<ChartTooltipContent />}
                    />

                    <Bar
                        dataKey="okPct"
                        name={EMAIL_LOG_CONFIG.ok.label}
                        stackId="emailLog"
                        shape={(props: BarShapeProps) => {
                            const { x, y, width, height, index } = props;
                            const color =
                                emailLogData[index]?.origin === 'user'
                                    ? lighten(OK_COLOR, 0.5)
                                    : OK_COLOR;

                            return (
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={color}
                                />
                            );
                        }}
                    >
                        <LabelList
                            dataKey="ok"
                            position="center"
                            content={(props) => {
                                const color =
                                    emailLogData[Number(props.index)]
                                        ?.origin === 'user'
                                        ? lighten(OK_COLOR, 0.5)
                                        : OK_COLOR;

                                return (
                                    <SegmentLabel
                                        {...props}
                                        fill={contrastTextColor(color)}
                                    />
                                );
                            }}
                        />
                    </Bar>

                    <Bar
                        dataKey="failedPct"
                        name={EMAIL_LOG_CONFIG.failed.label}
                        stackId="emailLog"
                        shape={(props: BarShapeProps) => {
                            const { x, y, width, height, index } = props;
                            const color =
                                emailLogData[index]?.origin === 'user'
                                    ? lighten(FAILED_COLOR, 0.5)
                                    : FAILED_COLOR;

                            return (
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={color}
                                />
                            );
                        }}
                    >
                        <LabelList
                            dataKey="failed"
                            position="center"
                            content={(props) => {
                                const color =
                                    emailLogData[Number(props.index)]
                                        ?.origin === 'user'
                                        ? lighten(FAILED_COLOR, 0.5)
                                        : FAILED_COLOR;

                                return (
                                    <SegmentLabel
                                        {...props}
                                        fill={contrastTextColor(color)}
                                    />
                                );
                            }}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        </ChartCard>
    );
};
