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
    type EventItem,
} from '@/lib/events';

// Resumen de una sesión para la lista del día. Todo el cuadro es pulsable
// (el título es un botón "estirado" sobre la tarjeta), sin anidar botones.
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
                    {event.seriesId && <Badge variant="outline">Serie</Badge>}
                    {event.registered && (
                        <Badge className="bg-brand-green text-white">
                            Inscrito
                        </Badge>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    {attendanceLabel(event)}
                    {isFull(event) ? ' · Completo' : ''}
                </p>
            </CardContent>
        </Card>
    );
}
