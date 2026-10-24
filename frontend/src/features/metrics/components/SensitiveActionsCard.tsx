import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ChartCard } from '@/features/stats/components/ChartCard';
import { RankList } from '@/features/stats/components/StatsChartKit';
import {
    formatMetricsDateTime,
    type MetricsSummary,
} from '@/features/metrics/lib/metrics';

const ACTION_LABELS: Record<string, string> = {
    role_change: 'Cambio de rol',
    active_change: 'Activación / desactivación',
    role_permissions_changed: 'Permisos de rol modificados',
    role_created: 'Rol creado',
    role_deleted: 'Rol eliminado',
    user_deleted: 'Usuario eliminado',
};

// Color del header del accordion según gravedad: borrados en rojo, cambios
// de permisos/rol en ámbar, activación/desactivación en azul.
const ACTION_SEVERITY_CLASS: Record<string, string> = {
    user_deleted: 'text-destructive bg-destructive/10',
    role_deleted: 'text-destructive bg-destructive/10',
    role_change: 'text-amber-600 bg-amber-500/10',
    role_permissions_changed: 'text-amber-600 bg-amber-500/10',
    active_change: 'text-sky-600 bg-sky-500/10',
};

export const SensitiveActionsCard = ({ metrics }: { metrics: MetricsSummary }) => {
    const sensitiveByAction = metrics.sensitiveActions.reduce<
        Record<string, typeof metrics.sensitiveActions>
    >((acc, a) => {
        (acc[a.action] ??= []).push(a);
        return acc;
    }, {});

    return (
        <ChartCard
            title="Acciones sensibles recientes"
            description="Roles, permisos y activación de usuarios"
            empty={metrics.sensitiveActions.length === 0}
        >
            <Accordion>
                {Object.entries(sensitiveByAction).map(([action, rows]) => (
                    <AccordionItem
                        key={action}
                        value={action}
                        className="border-b-0"
                    >
                        <AccordionTrigger
                            className={`px-3 ${ACTION_SEVERITY_CLASS[action] ?? ''}`}
                        >
                            {ACTION_LABELS[action] ?? action} ({rows.length})
                        </AccordionTrigger>
                        <AccordionContent>
                            <RankList
                                rows={rows.map((a) => ({
                                    id: a.id,
                                    title: `${a.actorName ?? '—'} → ${a.targetName ?? '—'}`,
                                    meta: formatMetricsDateTime(a.createdAt),
                                }))}
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </ChartCard>
    );
};
