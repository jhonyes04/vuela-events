import { UserPlus, UserRoundGroup, Users } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { attendanceLabel, type Attendee, type EventItem } from '@/features/events/lib/events';

interface EventAttendeesSectionProps {
    event: EventItem;
    attendees: Attendee[];
    failed: boolean;
    loading: boolean;
    canAddAttendees: boolean;
    canDeleteAttendees: boolean;
    onAddClick: () => void;
    onDeleteAttendee: (attendee: Attendee) => void;
}

export const EventAttendeesSection = ({
    event,
    attendees,
    failed,
    loading,
    canAddAttendees,
    canDeleteAttendees,
    onAddClick,
    onDeleteAttendee,
}: EventAttendeesSectionProps) => (
    <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground">
        <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
            <Users className="size-4 shrink-0 text-brand-green" />
            Inscritos ({event._count.registrations})
        </legend>

        {event.capacity !== null && (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserRoundGroup className="size-4 shrink-0 text-brand-green" />
                    <p className="text-muted-foreground">
                        {attendanceLabel(event)}
                    </p>
                </div>
                {canAddAttendees && (
                    <IconTooltip label="Agregar participantes">
                        <Button
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Agregar participantes"
                            onClick={onAddClick}
                        >
                            <UserPlus className="size-3.5" />
                        </Button>
                    </IconTooltip>
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
                className="max-h-48 rounded-lg bg-muted/50"
                options={scrollbarOptions}
                defer
            >
                <AttendeeChips
                    attendees={attendees}
                    onDelete={canDeleteAttendees ? onDeleteAttendee : undefined}
                />
            </OverlayScrollbarsComponent>
        )}
    </fieldset>
);
