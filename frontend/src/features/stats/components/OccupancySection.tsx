import { Gauge, Ticket } from 'lucide-react';
import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    Kpi,
    percentOf,
    RankList,
} from '@/features/stats/components/StatsChartKit';
import { formatStatsDate, type StatsSummary } from '@/features/stats/lib/stats';

interface OccupancySectionProps {
    stats: StatsSummary;
    averageRate: string;
}

export const OccupancySection = ({
    stats,
    averageRate,
}: OccupancySectionProps) => (
    <ChartCard
        title="Ocupación"
        description="Inscritos frente al aforo, de más a menos llenos."
        empty={stats.occupancyEvents.length === 0}
    >
        <div className="grid min-w-0 grid-cols-1 gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Kpi icon={Gauge} label="Ocupación media" value={averageRate} />
                <Kpi
                    icon={Ticket}
                    label="Completos"
                    value={String(stats.occupancy.fullEvents)}
                />
            </div>
            <RankList
                rows={stats.occupancyEvents.map((e) => {
                    const rate = percentOf(e.registrations, e.capacity);

                    return {
                        id: e.id,
                        title: e.title,
                        meta: `${formatStatsDate(e.startsAt)} · ${e.registrations} de ${e.capacity} plazas`,
                        value: `${rate} %`,
                        progress: Math.min(rate, 100),
                    };
                })}
            />
        </div>
    </ChartCard>
);
