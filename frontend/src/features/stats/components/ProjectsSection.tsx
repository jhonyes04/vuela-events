import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    HorizontalBars,
    StackedHorizontalBars,
} from '@/features/stats/components/StatsChartKit';
import { valueConfig } from '@/features/stats/lib/chartHelpers';
import type { StatsSummary } from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';

interface ProjectsSectionProps {
    section: SectionId;
    stats: StatsSummary;
}

export const ProjectsSection = ({ section, stats }: ProjectsSectionProps) => (
    <>
        {section === 'project-participants' && (
            <ChartCard
                title="Participantes por proyecto"
                description="Participantes AIL activos con alguna inscripción en el proyecto."
                empty={stats.participationsByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.participationsByProject.map((p) => ({
                        id: p.id,
                        name: p.name,
                        color: p.color,
                        participants: p.users.length,
                    }))}
                    metric="participants"
                    config={valueConfig('Participantes', 'var(--chart-3)')}
                />
            </ChartCard>
        )}

        {section === 'project-user-participations' && (
            <ChartCard
                title="Participaciones por participante"
                description="Cada barra es un Punto Vuela; los colores son los proyectos."
                empty={stats.participationsByUser.rows.length === 0}
            >
                <StackedHorizontalBars
                    rows={stats.participationsByUser.rows}
                    projects={stats.participationsByUser.projects}
                />
            </ChartCard>
        )}
    </>
);
