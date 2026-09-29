import { type ReactNode } from 'react';
import { CalendarDays, Clock, MapPin, User, Users } from 'lucide-react';
import {
    attendanceLabel,
    dayKey,
    formatDayLabel,
    formatTime,
    personLabel,
    type EventItem,
} from '@/features/events/lib/events';

interface EventInfoRowsProps {
    event: EventItem;
    // La ficha de detalle muestra quién organiza; la tarjeta no (ya se ve en otro sitio).
    showOrganizer?: boolean;
    // La tarjeta añade el badge "Completo" pegado al aforo; la ficha no lo necesita aquí.
    trailing?: ReactNode;
}

export const EventInfoRows = ({
    event,
    showOrganizer = false,
    trailing,
}: EventInfoRowsProps) => (
    <div className="grid gap-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-brand-green" />
            {formatDayLabel(dayKey(event.startsAt))}
        </p>
        <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-brand-green" />
            {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
        </p>

        {event.location && (
            <p className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-brand-green" />
                {event.location}
            </p>
        )}
        {showOrganizer && (
            <p className="flex items-center gap-2">
                <User className="size-4 shrink-0 text-brand-green" />
                {personLabel(event.createdBy)}
            </p>
        )}
        <p className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-brand-green" />
            {attendanceLabel(event)}
            {trailing}
        </p>
    </div>
);
