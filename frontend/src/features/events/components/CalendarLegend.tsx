import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getProjectColorChip } from '@/features/projects/lib/colors';
import { hasEnded, isFull, type EventItem } from '@/features/events/lib/events';

interface CalendarLegendProps {
    events: EventItem[];
}

// Leyenda de lo que se ve: proyectos de los eventos visibles, y completo/finalizado si los hay.
export const CalendarLegend = ({ events }: CalendarLegendProps) => {
    const projects = useMemo(() => {
        const byId = new Map(
            events
                .filter((event) => !hasEnded(event))
                .map((event) => [event.project.id, event.project]),
        );

        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [events]);

    if (events.length === 0) return null;

    const anyEnded = events.some((event) => hasEnded(event));
    // Un evento finalizado ya no cuenta como "Completo": prioridad a finalizado.
    const anyFull = events.some((event) => isFull(event) && !hasEnded(event));

    return (
        <div
            aria-label="Leyenda"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
        >
            <span className="text-xs font-medium text-muted-foreground">
                Leyenda:
            </span>
            {projects.map((project) => {
                const chip = getProjectColorChip(project.color);

                return (
                    <Badge
                        key={project.id}
                        className={chip.className}
                        style={chip.style}
                    >
                        {project.name}
                    </Badge>
                );
            })}
            {anyFull && (
                <Badge className="bg-red-500 text-white">Completo</Badge>
            )}
            {anyEnded && (
                <Badge className="bg-gray-400 text-white">Finalizado</Badge>
            )}
        </div>
    );
};
