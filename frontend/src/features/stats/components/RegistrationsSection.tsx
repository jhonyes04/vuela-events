import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    BarSeries,
    countConfig,
    HorizontalBars,
    valueConfig,
} from '@/features/stats/components/StatsChartKit';
import { monthLabel, type StatsSummary } from '@/features/stats/lib/stats';
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
                <BarSeries
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
    </>
);
