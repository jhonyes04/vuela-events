import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    HorizontalBars,
    valueConfig,
} from '@/features/stats/components/StatsChartKit';
import type { StatsSummary } from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';

interface UsersSectionProps {
    section: SectionId;
    stats: StatsSummary;
}

export const UsersSection = ({ section, stats }: UsersSectionProps) => (
    <>
        {section === 'users-top' && (
            <ChartCard
                title="Participantes más activos"
                description="Por número de inscripciones."
                empty={stats.topUsers.length === 0}
            >
                <HorizontalBars
                    data={stats.topUsers.map((u) => ({
                        id: u.id,
                        name: u.puntoVuela ?? 'Sin Punto Vuela',
                        color: null,
                        registrations: u.registrations,
                    }))}
                    metric="registrations"
                    config={valueConfig('Inscripciones', 'var(--brand-yellow)')}
                />
                <p className="mt-4 text-sm text-muted-foreground">
                    Participantes activos sin ninguna inscripción:{' '}
                    <strong className="text-foreground">
                        {stats.usersWithoutRegistrations}
                    </strong>
                </p>
            </ChartCard>
        )}

        {section === 'users-all' && (
            <ChartCard
                title="Todos los participantes"
                description="Ranking completo por número de inscripciones."
                empty={stats.registrationsByUser.length === 0}
            >
                <HorizontalBars
                    data={stats.registrationsByUser.map((u) => ({
                        id: u.id,
                        name: u.puntoVuela ?? 'Sin Punto Vuela',
                        color: null,
                        registrations: u.registrations,
                    }))}
                    metric="registrations"
                    maxHeight={Infinity}
                    config={valueConfig('Inscripciones', 'var(--brand-yellow)')}
                />
            </ChartCard>
        )}

        {section === 'users-interest-project' && (
            <ChartCard
                title="Participantes por proyecto"
                description="Participantes AIL activos que marcaron cada proyecto como interés."
                empty={stats.interestByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.interestByProject}
                    metric="interestedUsers"
                    config={valueConfig('Participantes', 'var(--chart-3)')}
                />
            </ChartCard>
        )}
    </>
);
