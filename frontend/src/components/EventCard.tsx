import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    attendanceLabel,
    formatTime,
    isFull,
    personLabel,
    type EventItem,
} from '@/lib/events';

import { useAttendees } from '@/hooks/useAttendees';

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
        <div className="relative z-10 grid gap-1">
            <p className="text-xs font-medium text-muted-foreground">
                Inscritos
            </p>
            <ul className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2 text-sm">
                {attendees.map((person) => (
                    <li key={person.id} className="break-words">
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
    return (
        <Card size="sm" className="relative hover:bg-muted/50">
            <CardHeader>
                <CardTitle>
                    <button
                        type="button"
                        onClick={() => onOpen(event)}
                        className="text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                        {event.title}
                    </button>
                </CardTitle>
                {event.subtitle && (
                    <p className="text-sm text-muted-foreground">
                        {event.subtitle}
                    </p>
                )}
                <CardDescription>
                    {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                    {event.location ? ` · ${event.location}` : ''}
                </CardDescription>
                <CardAction className="flex items-center gap-1.5">
                    {event.registered && (
                        <Badge className="bg-brand-green text-white">
                            Inscrito
                        </Badge>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="grid gap-2">
                <p className="text-muted-foreground">
                    {attendanceLabel(event)}
                    {isFull(event) ? ' · Completo' : ''}
                </p>
                <AttendeeList event={event} />
            </CardContent>
        </Card>
    );
}
