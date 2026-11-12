import { ChartCard } from '@/features/stats/components/ChartCard';
import { RankList } from '@/features/stats/components/StatsChartKit';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

export const SessionDurationByUserCard = ({
    metrics,
}: {
    metrics: MetricsSummary;
}) => (
    <ChartCard
        title="Duración media de sesión por usuario"
        description="Login → logout, en la ventana elegida"
        empty={metrics.sessionDurationByUser.length === 0}
        className="lg:col-span-2"
    >
        <RankList
            rows={metrics.sessionDurationByUser.map((user) => ({
                id: user.userId,
                title: user.puntoVuela
                    ? `${user.puntoVuela} (${user.userName})`
                    : user.userName,
                meta: `${user.sessionCount} cierres de sesión`,
                value: `${user.avgMinutes} min`,
            }))}
        />
    </ChartCard>
);
