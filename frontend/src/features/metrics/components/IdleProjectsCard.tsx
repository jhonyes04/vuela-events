import { ChartCard } from '@/features/stats/components/ChartCard';
import { RankList } from '@/features/stats/components/StatsChartKit';
import { formatStatsDate } from '@/features/stats/lib/stats';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

export const IdleProjectsCard = ({ metrics }: { metrics: MetricsSummary }) => (
    <ChartCard
        title="Proyectos sin eventos recientes"
        description="Sin eventos en la ventana elegida"
        empty={metrics.idleProjects.length === 0}
    >
        <RankList
            rows={metrics.idleProjects.map((p) => ({
                id: p.id,
                title: p.name,
                meta: p.lastEventAt
                    ? `Último evento: ${formatStatsDate(p.lastEventAt)}`
                    : 'Sin eventos nunca',
            }))}
        />
    </ChartCard>
);
