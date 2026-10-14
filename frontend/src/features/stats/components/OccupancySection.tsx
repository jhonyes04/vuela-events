import { ChartCard } from '@/features/stats/components/ChartCard';
import { OccupancyBars } from '@/features/stats/components/StatsChartKit';
import { percentOf } from '@/features/stats/lib/chartHelpers';
import { formatStatsDate, type StatsSummary } from '@/features/stats/lib/stats';

interface OccupancySectionProps {
    stats: StatsSummary;
}

export const OccupancySection = ({ stats }: OccupancySectionProps) => (
    <ChartCard
        title="Ocupación"
        description="Inscritos frente al aforo, primero los que antes finalizan. Los finalizados no se muestran."
        empty={stats.occupancyEvents.length === 0}
    >
        <OccupancyBars
            rows={stats.occupancyEvents.map((e) => ({
                id: e.id,
                title: e.title,
                meta: `${formatStatsDate(e.startsAt)} · ${e.registrations} de ${e.capacity} plazas`,
                rate: percentOf(e.registrations, e.capacity),
            }))}
        />
    </ChartCard>
);
