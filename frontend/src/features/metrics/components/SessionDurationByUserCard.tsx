import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    formatDurationDhm,
    type MetricsSummary,
} from '@/features/metrics/lib/metrics';
import { contrastTextColor } from '@/features/projects/lib/colors';

const TOTAL_COLOR = '#eae428';
const AVG_COLOR = '#f7b441';
const BAR_SIZE = 16;
const MIN_POINT_SIZE = 32;

const SESSION_DURATION_CONFIG = {
    totalMinutes: { label: 'Tiempo total', color: TOTAL_COLOR },
    avgMinutes: { label: 'Tiempo medio', color: AVG_COLOR },
} satisfies ChartConfig;

export const SessionDurationByUserCard = ({
    metrics,
}: {
    metrics: MetricsSummary;
}) => {
    const data = metrics.sessionDurationByUser.map((user) => ({
        id: user.userId,
        label: user.puntoVuela
            ? `${user.puntoVuela} (${user.userName})`
            : user.userName,
        totalMinutes: user.totalMinutes,
        avgMinutes: user.avgMinutes,
        totalPct: 100,
        avgPct:
            user.totalMinutes === 0
                ? 0
                : (user.avgMinutes / user.totalMinutes) * 100,
    }));

    return (
        <ChartCard
            title="Duración de sesión por usuario"
            description="Tiempo total y tiempo medio, en la ventana elegida"
            empty={data.length === 0}
            className="lg:col-span-2"
        >
            <ChartContainer
                config={SESSION_DURATION_CONFIG}
                className="w-full"
                style={{
                    height: Math.max(40, data.length * 26),
                }}
            >
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                    barGap={2}
                    barCategoryGap="10%"
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
                        content={
                            <ChartTooltipContent
                                formatter={(_value, _name, item) =>
                                    formatDurationDhm(
                                        item.dataKey === 'totalPct'
                                            ? item.payload.totalMinutes
                                            : item.payload.avgMinutes,
                                    )
                                }
                            />
                        }
                    />

                    <Bar
                        dataKey="totalPct"
                        name={SESSION_DURATION_CONFIG.totalMinutes.label}
                        fill={TOTAL_COLOR}
                        barSize={BAR_SIZE}
                        minPointSize={MIN_POINT_SIZE}
                    >
                        <LabelList
                            dataKey="totalMinutes"
                            position="insideRight"
                            fill={contrastTextColor(TOTAL_COLOR)}
                            formatter={(value) =>
                                formatDurationDhm(Number(value))
                            }
                        />
                    </Bar>
                    <Bar
                        dataKey="avgPct"
                        name={SESSION_DURATION_CONFIG.avgMinutes.label}
                        fill={AVG_COLOR}
                        barSize={BAR_SIZE}
                        minPointSize={MIN_POINT_SIZE}
                    >
                        <LabelList
                            dataKey="avgMinutes"
                            position="insideRight"
                            fill={contrastTextColor(AVG_COLOR)}
                            formatter={(value) =>
                                formatDurationDhm(Number(value))
                            }
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        </ChartCard>
    );
};
