import { Clock3, Repeat2, UserMinus, UserX } from 'lucide-react';
import { ChartCard } from '@/features/stats/components/ChartCard';
import type { MetricsSummary } from '@/features/metrics/lib/metrics';

export const MetricsKpiRow = ({ metrics }: { metrics: MetricsSummary }) => (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ChartCard title="Perfiles incompletos" empty={false}>
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <UserX className="size-4" />
                Usuarios
            </span>
            <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
                {metrics.incompleteProfiles}
            </p>
        </ChartCard>
        <ChartCard title="AILs inactivos" empty={false}>
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <UserMinus className="size-4" />
                En la ventana elegida
            </span>
            <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
                {metrics.inactiveAilCount}
            </p>
        </ChartCard>
        <ChartCard title="Antelación media" empty={false}>
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Clock3 className="size-4" />
                Creación → fecha
            </span>
            <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
                {metrics.avgLeadTimeDays === null
                    ? '—'
                    : `${metrics.avgLeadTimeDays} días`}
            </p>
        </ChartCard>
        <ChartCard title="Retención AIL" empty={false}>
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Repeat2 className="size-4" />
                2+ eventos distintos
            </span>
            <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
                {metrics.retention.percent === null
                    ? '—'
                    : `${metrics.retention.percent} %`}
            </p>
        </ChartCard>
    </div>
);
