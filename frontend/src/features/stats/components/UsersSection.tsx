import { ChartCard } from '@/features/stats/components/ChartCard';
import {
    HorizontalBars,
    initials,
    RankList,
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
                title="Usuarios más activos"
                description="Por número de inscripciones."
                empty={stats.topUsers.length === 0}
            >
                <RankList
                    rows={stats.topUsers.map((u) => ({
                        id: u.id,
                        title: u.name,
                        meta: u.puntoVuela ?? 'Sin Punto Vuela',
                        value: String(u.registrations),
                        leading: initials(u.name),
                    }))}
                />
                <p className="mt-4 text-sm text-muted-foreground">
                    Usuarios activos sin ninguna inscripción:{' '}
                    <strong className="text-foreground">
                        {stats.usersWithoutRegistrations}
                    </strong>
                </p>
            </ChartCard>
        )}

        {section === 'users-all' && (
            <ChartCard
                title="Todos los usuarios"
                description="Ranking completo por número de inscripciones."
                empty={stats.registrationsByUser.length === 0}
            >
                <RankList
                    rows={stats.registrationsByUser.map((u) => ({
                        id: u.id,
                        title: u.name,
                        meta: u.puntoVuela ?? 'Sin Punto Vuela',
                        value: String(u.registrations),
                        leading: initials(u.name),
                    }))}
                />
            </ChartCard>
        )}

        {section === 'users-interest-category' && (
            <ChartCard
                title="Usuarios por proyecto"
                description="Usuarios AIL activos que marcaron cada proyecto como interés."
                empty={stats.interestByProject.length === 0}
            >
                <HorizontalBars
                    data={stats.interestByProject}
                    metric="interestedUsers"
                    config={valueConfig('Usuarios', 'var(--chart-3)')}
                />
            </ChartCard>
        )}
    </>
);
