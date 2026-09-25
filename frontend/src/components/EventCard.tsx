import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatTime, type EventItem } from '@/lib/events';

const attendance = (taken: number, capacity: number | null): string => {
    if (capacity === null) {
        return `${taken} ${taken === 1 ? 'inscrito' : 'inscritos'}`;
    }

    return `${taken} de ${capacity} plazas`;
};

export function EventCard({ event }: { event: EventItem }) {
    const taken = event._count.registrations;
    const full = event.capacity !== null && taken >= event.capacity;

    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                    {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                    {event.location ? ` · ${event.location}` : ''}
                </CardDescription>
                {event.registered && (
                    <CardAction>
                        <Badge className="bg-brand-green text-white">
                            Inscrito
                        </Badge>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                {event.description && (
                    <p className="whitespace-pre-line">{event.description}</p>
                )}
                <p className="text-muted-foreground">
                    {attendance(taken, event.capacity)}
                    {full ? ' · Completo' : ''} · Organiza{' '}
                    {event.createdBy.name}
                </p>
            </CardContent>
        </Card>
    );
}
