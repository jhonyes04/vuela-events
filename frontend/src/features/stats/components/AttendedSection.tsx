import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    AreaSeries,
    BarSeries,
    countConfig,
    HorizontalBars,
    valueConfig,
} from '@/features/stats/components/StatsChartKit';
import {
    monthLabel,
    quarterLabel,
    type StatsSummary,
} from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';

interface AttendedSectionProps {
    section: SectionId;
    stats: StatsSummary;
}

export const AttendedSection = ({ section, stats }: AttendedSectionProps) => (
    <>
        {section === 'attended-month' && (
            <ChartCard
                title="Atendidos por mes"
                empty={stats.attendedByMonth.length === 0}
            >
                <AreaSeries
                    id="grad-attended-month"
                    data={stats.attendedByMonth}
                    config={countConfig('Atendidos', 'var(--chart-3)')}
                    labelOf={monthLabel}
                />
            </ChartCard>
        )}

        {section === 'attended-quarter' && (
            <ChartCard
                title="Atendidos por trimestre"
                empty={stats.attendedByQuarter.length === 0}
            >
                <BarSeries
                    data={stats.attendedByQuarter}
                    config={countConfig('Atendidos', 'var(--chart-3)')}
                    labelOf={quarterLabel}
                />
            </ChartCard>
        )}

        {section === 'attended-project' && (
            <ChartCard
                title="Atendidos por proyecto"
                empty={stats.attendedByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.attendedByProject}
                    metric="attended"
                    config={valueConfig('Atendidos', 'var(--chart-3)')}
                />
            </ChartCard>
        )}

        {section === 'attended-year' && (
            <ChartCard
                title="Atendidos por año"
                empty={stats.attendedByYear.length === 0}
            >
                <BarSeries
                    data={stats.attendedByYear}
                    config={countConfig('Atendidos', 'var(--chart-3)')}
                    labelOf={(key) => key}
                />
            </ChartCard>
        )}

        {section === 'attended-total' && (
            <ChartCard
                title="Atendidos en total"
                description="Suma de los datos de atendidos de todos los eventos."
                empty={stats.totals.attended === 0}
            >
                <div className="grid place-items-center gap-2 py-8">
                    <p className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
                        {stats.totals.attended}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        personas atendidas
                    </p>
                </div>
            </ChartCard>
        )}
    </>
);
