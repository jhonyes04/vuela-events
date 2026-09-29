import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    attendanceLabel,
    dayKey,
    formatDayLabel,
    formatTime,
    isFull,
    personLabel,
    type EventItem,
} from '@/features/events/lib/events';

import { useAttendees } from '@/features/events/hooks/useAttendees';

// Inscritos del evento como "Punto Vuela (Nombre)". Va por encima del botón
// estirado de la tarjeta (z-10) para poder desplazarla y seleccionar el texto.
function AttendeeList({ event }: { event: EventItem }) {
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
            <ul className="grid max-h-40 gap-1 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                {attendees.map((person) => (
                    <li
                        key={person.id}
                        className="rounded-md bg-card px-2 py-1 break-words ring-1 ring-border"
                    >
                        {personLabel(person)}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function EventCard({
    event,
    onOpen,
}: {
    event: EventItem;
    onOpen: (event: EventItem) => void;
}) {
    const full = isFull(event);

    return (
        <Card className="group relative gap-0 overflow-hidden border-t-4 border-t-brand-yellow py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader className="gap-1.5 bg-muted/30 px-4! py-4!">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base leading-snug font-semibold">
                        <button
                            type="button"
                            onClick={() => onOpen(event)}
                            className="text-left outline-none after:absolute after:inset-0 group-hover:underline focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                        >
                            {event.title}
                        </button>
                    </h3>
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
                <div className="grid gap-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0 text-brand-green" />
                        {formatDayLabel(dayKey(event.startsAt))}
                    </p>
                    <p className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0 text-brand-green" />
                        {formatTime(event.startsAt)} –{' '}
                        {formatTime(event.endsAt)}
                    </p>
                    {event.location && (
                        <p className="flex items-center gap-2">
                            <MapPin className="size-4 shrink-0 text-brand-green" />
                            {event.location}
                        </p>
                    )}
                    <p className="flex items-center gap-2">
                        <Users className="size-4 shrink-0 text-brand-green" />
                        {attendanceLabel(event)}
                        {full && (
                            <Badge variant="secondary" className="ml-1">
                                Completo
                            </Badge>
                        )}
                    </p>
                </div>
                <AttendeeList event={event} />
            </CardContent>
        </Card>
    );
}
