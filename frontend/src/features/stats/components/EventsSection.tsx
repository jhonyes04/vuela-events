import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    AreaSeries,
    countConfig,
    HorizontalBars,
    StatusDonut,
    BarSeries,
    valueConfig,
} from '@/features/stats/components/StatsChartKit';
import {
    monthLabel,
    quarterLabel,
    type StatsSummary,
} from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';

interface EventsSectionProps {
    section: SectionId;
    stats: StatsSummary;
}

export const EventsSection = ({ section, stats }: EventsSectionProps) => (
    <>
        {section === 'events-month' && (
            <ChartCard
                title="Eventos por mes"
                empty={stats.eventsByMonth.length === 0}
            >
                <AreaSeries
                    id="grad-events-month"
                    data={stats.eventsByMonth}
                    config={countConfig('Eventos', 'var(--chart-1)')}
                    labelOf={monthLabel}
                />
            </ChartCard>
        )}

        {section === 'events-quarter' && (
            <ChartCard
                title="Eventos por trimestre"
                empty={stats.eventsByQuarter.length === 0}
            >
                <BarSeries
                    data={stats.eventsByQuarter}
                    config={countConfig('Eventos', 'var(--chart-1)')}
                    labelOf={quarterLabel}
                />
            </ChartCard>
        )}

        {section === 'events-year' && (
            <ChartCard
                title="Eventos por año"
                empty={stats.eventsByYear.length === 0}
            >
                <BarSeries
                    data={stats.eventsByYear}
                    config={countConfig('Eventos', 'var(--chart-1)')}
                    labelOf={(key) => key}
                />
            </ChartCard>
        )}

        {section === 'events-status' && (
            <ChartCard
                title="Estado de los eventos"
                description="Pasados, en curso y próximos."
                empty={stats.totals.events === 0}
            >
                <StatusDonut stats={stats} />
            </ChartCard>
        )}

        {section === 'events-category' && (
            <ChartCard
                title="Eventos por proyecto"
                empty={stats.eventsByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.eventsByProject}
                    metric="events"
                    config={valueConfig('Eventos', 'var(--chart-1)')}
                />
            </ChartCard>
        )}

        {section === 'events-guide' && (
            <ChartCard
                title="Eventos por guía"
                empty={stats.eventsByGuide.length === 0}
            >
                <HorizontalBars
                    data={stats.eventsByGuide}
                    metric="events"
                    config={valueConfig('Eventos', 'var(--chart-1)')}
                />
            </ChartCard>
        )}
    </>
);
