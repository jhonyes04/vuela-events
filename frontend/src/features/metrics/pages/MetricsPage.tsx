import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ComboboxField } from '@/components/ComboboxField';
import { PageTitle } from '@/components/PageTitle';
import { MetricsKpiRow } from '@/features/metrics/components/MetricsKpiRow';
import { SignupsByRoleCard } from '@/features/metrics/components/SignupsByRoleCard';
import { SensitiveActionsCard } from '@/features/metrics/components/SensitiveActionsCard';
import { SeriesStatusCard } from '@/features/metrics/components/SeriesStatusCard';
import { IdleProjectsCard } from '@/features/metrics/components/IdleProjectsCard';
import { YearOverYearCard } from '@/features/metrics/components/YearOverYearCard';
import { InterestVsRegistrationCard } from '@/features/metrics/components/InterestVsRegistrationCard';
import {
    getMetrics,
    type MetricsSummary,
} from '@/features/metrics/lib/metrics';

const WINDOW_OPTIONS = [
    { id: '30', label: 'Últimos 30 días' },
    { id: '90', label: 'Trimestre' },
    { id: '180', label: 'Semestre' },
    { id: '365', label: 'Anual' },
    { id: '3650', label: 'Todo el histórico' },
];

export const MetricsPage = () => {
    const [days, setDays] = useState('30');
    const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
    const [failed, setFailed] = useState(false);

    const loadMetrics = (value: string) =>
        getMetrics(Number(value))
            .then(setMetrics)
            .catch(() => setFailed(true));

    useEffect(() => {
        void loadMetrics(days);
    }, [days]);

    if (failed) {
        return (
            <p className="text-sm text-destructive">
                No se pudieron cargar las métricas.
            </p>
        );
    }

    if (!metrics) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Cargando métricas…
            </p>
        );
    }

    return (
        <section className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-8">
            <header>
                <div className="flex items-start justify-between">
                    <PageTitle icon={Gauge}>Métricas</PageTitle>
                </div>

                <div className="grid w-full max-w-xs gap-1.5">
                    <Label
                        htmlFor="metrics-window"
                        className="text-xs font-bold text-black"
                    >
                        Rango
                    </Label>
                    <ComboboxField
                        id="metrics-window"
                        className="w-full bg-card"
                        items={WINDOW_OPTIONS}
                        getValue={(o) => o.id}
                        getLabel={(o) => o.label}
                        value={days}
                        onValueChange={setDays}
                        searchable={false}
                    />
                </div>
            </header>

            <MetricsKpiRow metrics={metrics} />

            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                <SignupsByRoleCard metrics={metrics} />
                <SensitiveActionsCard metrics={metrics} />
                <SeriesStatusCard metrics={metrics} />
                <IdleProjectsCard metrics={metrics} />
                <YearOverYearCard
                    title="Eventos: este año vs anterior"
                    metrics={metrics}
                    field="events"
                />
                <YearOverYearCard
                    title="Inscripciones: este año vs anterior"
                    metrics={metrics}
                    field="registrations"
                />
                <InterestVsRegistrationCard metrics={metrics} />
            </div>
        </section>
    );
};
