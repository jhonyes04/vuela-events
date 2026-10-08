import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { EventInfoRows } from '@/features/events/components/EventInfoRows';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import { cn } from '@/lib/utils';
import { hasEnded, isFull, type EventItem } from '@/features/events/lib/events';

import { useAttendees } from '@/features/events/hooks/useAttendees';

interface AttendeeListProps {
    event: EventItem;
}

// Va por encima del botón estirado de la tarjeta (z-10) para poder
// desplazarla y seleccionar el texto.
const AttendeeList = ({ event }: AttendeeListProps) => {
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${event.registered}`,
    );

    if (loading) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Cargando inscritos…
            </p>
        );
    }

    if (failed) {
        return (
            <p className="text-sm text-destructive">
                No se pudo cargar la lista de inscritos.
            </p>
        );
    }

    if (attendees.length === 0) return null;

    return (
        <div className="relative z-10 grid gap-1.5">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Inscritos
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/50">
                <AttendeeChips attendees={attendees} />
            </div>
        </div>
    );
};

interface EventCardProps {
    event: EventItem;
    onOpen: (event: EventItem) => void;
}

export const EventCard = ({ event, onOpen }: EventCardProps) => {
    const full = isFull(event);
    const ended = hasEnded(event);
    const colorStyle = ended
        ? { border: 'border-t-gray-400', tint: 'bg-gray-400/10' }
        : full
          ? { border: 'border-t-red-500', tint: 'bg-red-500/10' }
          : CATEGORY_COLOR_STYLES[event.category.color];

    return (
        <Card
            className={cn(
                'group relative cursor-pointer gap-0 overflow-hidden border-t-4 py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                colorStyle.border,
            )}
        >
            <CardHeader className={cn('gap-1.5 px-4! py-4!', colorStyle.tint)}>
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base leading-snug font-semibold">
                        <button
                            type="button"
                            onClick={() => onOpen(event)}
                            className="cursor-pointer text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                        >
                            {event.title}
                        </button>
                    </h3>
                    {ended && (
                        <Badge className="shrink-0 bg-gray-400 text-white">
                            Finalizado
                        </Badge>
                    )}
                    {event.registered && (
                        <Badge className="shrink-0 bg-brand-green text-white">
                            Inscrito
                        </Badge>
                    )}
                </div>
                {event.subtitle && (
                    <p className="text-sm text-muted-foreground">
                        {event.subtitle}
                    </p>
                )}
            </CardHeader>
            <CardContent className="grid gap-3 px-4! py-4!">
                <EventInfoRows
                    event={event}
                    trailing={
                        full &&
                        !ended && (
                            <Badge variant="destructive" className="ml-1">
                                Completo
                            </Badge>
                        )
                    }
                />
                {ended && (
                    <p className="text-sm text-muted-foreground">
                        Usuarios atendidos:{' '}
                        <strong className="text-foreground">
                            {event.participantsCount ?? 'sin indicar'}
                        </strong>
                        {event.participantsObservations && (
                            <>
                                {' — '}
                                {event.participantsObservations}
                            </>
                        )}
                    </p>
                )}
                <AttendeeList event={event} />
            </CardContent>
        </Card>
    );
};
