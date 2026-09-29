import { useState } from 'react';
import {
    CalendarDays,
    CircleAlert,
    CircleCheck,
    Clock,
    MapPin,
    User,
    Users,
} from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/auth/context';
import { DeleteEventDialog } from '@/components/DeleteEventDialog';
import { DeleteEventSeriesDialog } from '@/components/DeleteEventSeriesDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAttendees } from '@/hooks/useAttendees';
import { ApiError } from '@/lib/api';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import {
    attendanceLabel,
    dayKey,
    formatDayLabel,
    formatTime,
    googleCalendarUrl,
    hasEnded,
    isFull,
    personLabel,
    registerForEventById,
    unregisterFromEventById,
    type EventItem,
} from '@/lib/events';

type Feedback = { kind: 'error' | 'success'; message: string };

// Contenido con su propio estado: se recrea al cambiar de evento (key).
function EventDetailBody({
    event,
    onClose,
    onChanged,
    onDeleted,
}: {
    event: EventItem;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: (message: string) => void;
}) {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
    // Se refresca cuando cambia el número de inscritos o la inscripción propia.
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${event.registered}`,
    );

    const ended = hasEnded(event);
    const isDt = user?.roleId === 'dt';
    const isAdmin = user?.roleId === 'admin';
    // Un DT puede inscribirse aunque esté completo: no ocupa plaza.
    const blockedByCapacity = isFull(event) && !isDt && !event.registered;

    // Solo oculta el botón: el servidor comprueba de nuevo quién puede eliminar.
    const canDelete =
        (user?.permissions.includes('events:delete') ?? false) &&
        (user?.roleId === 'admin' || event.createdBy.id === user?.id);

    const run = async (action: () => Promise<void>, success: string) => {
        setBusy(true);
        setFeedback(null);

        try {
            await action();

            setFeedback({ kind: 'success', message: success });
            onChanged();
        } catch (e) {
            setFeedback({
                kind: 'error',
                message:
                    e instanceof ApiError
                        ? e.message
                        : 'No se pudo completar la acción',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {/* Mientras se confirma la eliminación se oculta la ficha. */}
            <Dialog
                open={!confirmOpen && !seriesConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) onClose();
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{event.title}</DialogTitle>
                        <DialogDescription>
                            {event.subtitle ?? 'Detalle de la sesión'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-1.5">
                        {event.registered && (
                            <Badge className="bg-brand-green text-white">
                                Inscrito
                            </Badge>
                        )}
                        {isFull(event) && (
                            <Badge variant="secondary">Completo</Badge>
                        )}
                        {ended && <Badge variant="outline">Finalizado</Badge>}
                    </div>

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
                            <User className="size-4 shrink-0 text-brand-green" />
                            {personLabel(event.createdBy)}
                        </p>
                        <p className="flex items-center gap-2">
                            <Users className="size-4 shrink-0 text-brand-green" />
                            {attendanceLabel(event)}
                        </p>
                    </div>

                    {event.description && (
                        <p className="text-sm whitespace-pre-line">
                            {event.description}
                        </p>
                    )}

                    <section
                        aria-labelledby="attendees-title"
                        className="grid gap-1.5"
                    >
                        <h3
                            id="attendees-title"
                            className="text-xs font-bold tracking-wide text-muted-foreground uppercase"
                        >
                            Inscritos ({event._count.registrations})
                        </h3>
                        {loading ? (
                            <p
                                role="status"
                                className="text-sm text-muted-foreground"
                            >
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
                                <ul className="grid gap-1 p-2 text-sm">
                                    {attendees.map((person) => (
                                        <li
                                            key={person.id}
                                            className="rounded-md bg-card px-2 py-1 break-words ring-1 ring-border"
                                        >
                                            {personLabel(person)}
                                        </li>
                                    ))}
                                </ul>
                            </OverlayScrollbarsComponent>
                        )}
                    </section>

                    {feedback && (
                        <Alert
                            variant={
                                feedback.kind === 'error'
                                    ? 'destructive'
                                    : 'success'
                            }
                        >
                            {feedback.kind === 'error' ? (
                                <CircleAlert />
                            ) : (
                                <CircleCheck />
                            )}
                            <AlertTitle>
                                {feedback.kind === 'error'
                                    ? 'No se pudo completar'
                                    : feedback.message}
                            </AlertTitle>
                            {feedback.kind === 'error' && (
                                <AlertDescription>
                                    {feedback.message}
                                </AlertDescription>
                            )}
                        </Alert>
                    )}

                    <DialogFooter>
                        <div className="flex gap-2 sm:mr-auto">
                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    Eliminar sesión
                                </Button>
                            )}

                            {canDelete && event.seriesId && (
                                <Button
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() => setSeriesConfirmOpen(true)}
                                >
                                    Eliminar toda la serie
                                </Button>
                            )}
                        </div>

                        {!ended && event.registered && (
                            <a
                                href={googleCalendarUrl(event)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({
                                    variant: 'secondary',
                                })}
                            >
                                Añadir a Google Calendar
                            </a>
                        )}

                        {ended ? (
                            <p className="self-center text-sm text-muted-foreground">
                                Este evento ya ha finalizado.
                            </p>
                        ) : isAdmin ? null : event.registered ? (
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                    void run(
                                        () => unregisterFromEventById(event.id),
                                        'Has cancelado tu inscripción.',
                                    )
                                }
                            >
                                Cancelar inscripción
                            </Button>
                        ) : (
                            <Button
                                disabled={busy || blockedByCapacity}
                                onClick={() =>
                                    void run(
                                        () => registerForEventById(event.id),
                                        'Te has inscrito correctamente.',
                                    )
                                }
                            >
                                {blockedByCapacity ? 'Completo' : 'Inscribirme'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {canDelete && (
                <DeleteEventDialog
                    event={event}
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    onDeleted={() =>
                        onDeleted(`Sesión «${event.title}» eliminada.`)
                    }
                />
            )}

            {canDelete && event.seriesId && (
                <DeleteEventSeriesDialog
                    event={event}
                    open={seriesConfirmOpen}
                    onOpenChange={setSeriesConfirmOpen}
                    onDeleted={(count) =>
                        onDeleted(
                            `Se han eliminado ${count} sesión${count === 1 ? '' : 'es'} futura${count === 1 ? '' : 's'} de «${event.title}».`,
                        )
                    }
                />
            )}
        </>
    );
}

export function EventDetailDialog({
    event,
    onClose,
    onChanged,
    onDeleted,
}: {
    event: EventItem | null;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: (message: string) => void;
}) {
    if (!event) return null;

    return (
        <EventDetailBody
            key={event.id}
            event={event}
            onClose={onClose}
            onChanged={onChanged}
            onDeleted={onDeleted}
        />
    );
}
