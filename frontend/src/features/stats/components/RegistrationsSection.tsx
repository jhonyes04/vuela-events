import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    AreaSeries,
    countConfig,
    HorizontalBars,
    RankList,
    valueConfig,
} from '@/features/stats/components/StatsChartKit';
import {
    formatStatsDate,
    monthLabel,
    type StatsSummary,
} from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';

interface RegistrationsSectionProps {
    section: SectionId;
    stats: StatsSummary;
}

export const RegistrationsSection = ({
    section,
    stats,
}: RegistrationsSectionProps) => (
    <>
        {section === 'reg-month' && (
            <ChartCard
                title="Inscripciones por mes"
                empty={stats.registrationsByMonth.length === 0}
            >
                <AreaSeries
                    id="grad-reg-month"
                    data={stats.registrationsByMonth}
                    config={countConfig('Inscripciones', 'var(--chart-2)')}
                    labelOf={monthLabel}
                />
            </ChartCard>
        )}

        {section === 'reg-project' && (
            <ChartCard
                title="Inscripciones por proyecto"
                empty={stats.registrationsByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.registrationsByProject}
                    metric="registrations"
                    config={valueConfig('Inscripciones', 'var(--chart-2)')}
                />
            </ChartCard>
        )}

        {section === 'reg-top-events' && (
            <ChartCard
                title="Eventos con más inscritos"
                empty={stats.topEvents.length === 0}
            >
                <RankList
                    rows={stats.topEvents.map((e) => ({
                        id: e.id,
                        title: e.title,
                        meta: formatStatsDate(e.startsAt),
                        value: String(e.registrations),
                    }))}
                />
            </ChartCard>
        )}
    </>
);
