import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { ClipboardList, UserRoundGroup, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { EventInfoRows } from '@/features/events/components/EventInfoRows';
import {
    getProjectColorBorder,
    getProjectColorTint,
} from '@/features/projects/lib/colors';
import { cn } from '@/lib/utils';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import {
    attendanceLabel,
    hasEnded,
    isFull,
    type EventItem,
} from '@/features/events/lib/events';

import { useAttendees } from '@/features/events/hooks/useAttendees';

interface AttendeeListProps {
    event: EventItem;
}

// Va por encima del botón estirado de la tarjeta (z-10) para poder
// desplazarla y seleccionar el texto. Mismo fieldset que en EventDetailDialog.
const AttendeeList = ({ event }: AttendeeListProps) => {
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${event.registered}`,
    );
    const full = isFull(event);
    const ended = hasEnded(event);

    return (
        <fieldset className="relative z-10 rounded-xl border p-3 text-sm text-muted-foreground">
            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                <Users className="size-4 shrink-0 text-brand-green" />
                Inscritos ({event._count.registrations})
            </legend>

            {event.capacity !== null && (
                <div className="mb-1.5 flex items-center gap-2">
                    <UserRoundGroup className="size-4 shrink-0 text-brand-green" />
                    <p className="text-muted-foreground">
                        {attendanceLabel(event)}
                    </p>
                    {full && !ended && (
                        <Badge variant="destructive" className="ml-1">
                            Completo
                        </Badge>
                    )}
                </div>
            )}

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando inscritos…
                </p>
            ) : failed ? (
                <p className="text-sm text-destructive">
                    No se pudo cargar la lista de inscritos.
                </p>
            ) : attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay inscritos.
                </p>
            ) : (
                <OverlayScrollbarsComponent
                    className="max-h-40 rounded-lg bg-muted/50"
                    options={scrollbarOptions}
                    defer
                >
                    <AttendeeChips attendees={attendees} />
                </OverlayScrollbarsComponent>
            )}
        </fieldset>
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
        ? {
              border: { className: 'border-t-gray-400' },
              tint: { className: 'bg-gray-400/10' },
          }
        : full
          ? {
                border: { className: 'border-t-red-500' },
                tint: { className: 'bg-red-500/10' },
            }
          : {
                border: getProjectColorBorder(event.project.color),
                tint: getProjectColorTint(event.project.color),
            };

    return (
        <Card
            className={cn(
                'group relative cursor-pointer gap-0 overflow-hidden border-t-4 py-0 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                colorStyle.border.className,
            )}
            onClick={() => onOpen(event)}
            style={colorStyle.border.style}
        >
            <CardHeader
                className={cn('gap-1.5 px-4! py-4!', colorStyle.tint.className)}
                style={colorStyle.tint.style}
            >
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base leading-snug font-semibold">
                        {event.title}
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
                <EventInfoRows event={event} showProject={false} />
                <AttendeeList event={event} />
                {ended && (
                    <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground">
                        <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                            <ClipboardList className="size-4 shrink-0 text-brand-green" />
                            Usuarios atendidos
                        </legend>
                        <p className="justify-self-end">
                            <strong className="text-foreground">
                                {event.participantsCount ?? 'Sin indicar'}
                            </strong>
                            {event.participantsObservations && (
                                <>
                                    {' — '}
                                    {event.participantsObservations}
                                </>
                            )}
                        </p>
                    </fieldset>
                )}
            </CardContent>
        </Card>
    );
};
