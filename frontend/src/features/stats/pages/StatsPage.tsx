import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Gauge, Ticket, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ComboboxField } from '@/components/ComboboxField';
import { Kpi } from '@/features/stats/components/StatsChartKit';
import { EventsSection } from '@/features/stats/components/EventsSection';
import { RegistrationsSection } from '@/features/stats/components/RegistrationsSection';
import { OccupancySection } from '@/features/stats/components/OccupancySection';
import { UsersSection } from '@/features/stats/components/UsersSection';
import { ProjectsSection } from '@/features/stats/components/ProjectsSection';
import { AttendedSection } from '@/features/stats/components/AttendedSection';
import { PendingSection } from '@/features/stats/components/PendingSection';
import { getStats, type StatsSummary } from '@/features/stats/lib/stats';
import {
    GROUP_ORDER,
    SECTIONS,
    type GroupId,
    type SectionId,
} from '@/features/stats/lib/sections';
import { PageTitle } from '@/components/PageTitle';

export const StatsPage = () => {
    const [stats, setStats] = useState<StatsSummary | null>(null);
    const [failed, setFailed] = useState(false);
    const [group, setGroup] = useState<GroupId>(GROUP_ORDER[0]);
    const [section, setSection] = useState<SectionId>(
        SECTIONS.find((s) => s.group === GROUP_ORDER[0])!.id,
    );
    const [yearId, setYearId] = useState('all');
    const year = yearId === 'all' ? null : Number(yearId);

    const groupSections = SECTIONS.filter((s) => s.group === group);

    // Al cambiar de tipo, el subtipo vuelve a su primera vista.
    const changeGroup = (value: GroupId) => {
        const first = SECTIONS.find((s) => s.group === value);

        setGroup(value);

        if (first) setSection(first.id);
    };

    const loadStats = (y: number | null) =>
        getStats(y)
            .then(setStats)
            .catch(() => setFailed(true));

    useEffect(() => {
        void loadStats(year);
    }, [year]);

    if (failed) {
        return (
            <p className="text-sm text-destructive">
                No se pudieron cargar las estadísticas.
            </p>
        );
    }

    if (!stats) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Cargando estadísticas…
            </p>
        );
    }

    const averageRate =
        stats.occupancy.averageRate === null
            ? '—'
            : `${stats.occupancy.averageRate} %`;

    return (
        <section className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid gap-1">
                    <PageTitle icon={BarChart3}>Estadísticas</PageTitle>
                    <p className="text-sm text-muted-foreground">
                        Eventos, inscripciones y personas atendidas.
                    </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:w-[min(44rem,100%)] sm:grid-cols-[8rem_10rem_1fr]">
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="stats-year"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Año
                        </Label>
                        <ComboboxField
                            id="stats-year"
                            className="w-full bg-card"
                            items={[
                                { id: 'all', label: 'Todos' },
                                ...stats.availableYears.map((y) => ({
                                    id: String(y),
                                    label: String(y),
                                })),
                            ]}
                            getValue={(y) => y.id}
                            getLabel={(y) => y.label}
                            value={yearId}
                            onValueChange={setYearId}
                            searchable={false}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="stats-group"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Tipo
                        </Label>
                        <ComboboxField
                            id="stats-group"
                            className="w-full bg-card"
                            items={GROUP_ORDER}
                            getValue={(g) => g}
                            getLabel={(g) => g}
                            value={group}
                            onValueChange={(v) => changeGroup(v as GroupId)}
                            searchable={false}
                        />
                    </div>

                    {groupSections.length > 1 && (
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="stats-section"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Estadística
                            </Label>
                            <ComboboxField
                                id="stats-section"
                                className="w-full bg-card"
                                items={groupSections}
                                getValue={(s) => s.id}
                                getLabel={(s) => s.label}
                                value={section}
                                onValueChange={(v) =>
                                    setSection(v as SectionId)
                                }
                                searchable={false}
                            />
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                    icon={CalendarDays}
                    label="Eventos"
                    value={String(stats.totals.events)}
                    series={stats.eventsByMonth}
                    color="var(--chart-1)"
                />
                <Kpi
                    icon={Ticket}
                    label="Inscripciones"
                    value={String(stats.totals.registrations)}
                    series={stats.registrationsByMonth}
                    color="var(--chart-2)"
                />
                <Kpi
                    icon={Users}
                    label="Atendidos"
                    value={String(stats.totals.attended)}
                    series={stats.attendedByMonth}
                    color="var(--chart-3)"
                />
                <Kpi
                    icon={Gauge}
                    label="Ocupación media"
                    value={averageRate}
                    series={stats.occupancyByMonth}
                    color="var(--chart-4)"
                />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6">
                {group === 'Eventos' && (
                    <EventsSection section={section} stats={stats} />
                )}
                {group === 'Inscripciones' && (
                    <RegistrationsSection section={section} stats={stats} />
                )}
                {group === 'Ocupación' && (
                    <OccupancySection stats={stats} averageRate={averageRate} />
                )}
                {group === 'Participantes' && (
                    <>
                        <UsersSection section={section} stats={stats} />
                        <ProjectsSection section={section} stats={stats} />
                    </>
                )}
                {group === 'Atendidos' && (
                    <AttendedSection section={section} stats={stats} />
                )}
                {group === 'Pendientes' && (
                    <PendingSection
                        stats={stats}
                        onSaved={() => void loadStats(year)}
                    />
                )}
            </div>
        </section>
    );
};
