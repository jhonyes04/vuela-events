import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import { ROLE_IDS } from '@/features/users/lib/roles';
import { DeleteEventDialog } from '@/features/events/components/DeleteEventDialog';
import { DeleteEventSeriesDialog } from '@/features/events/components/DeleteEventSeriesDialog';
import { EventInfoRows } from '@/features/events/components/EventInfoRows';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { AddParticipantsDialog } from '@/features/events/components/AddParticipantsDialog';
import { ParticipantsCountDialog } from '@/features/events/components/ParticipantsCountDialog';
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
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { useAttendees } from '@/features/events/hooks/useAttendees';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import {
    adminUnregisterAttendee,
    googleCalendarUrl,
    hasEnded,
    isFull,
    registerForEventById,
    unregisterFromEventById,
    type Attendee,
    type EventItem,
} from '@/features/events/lib/events';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, UserPlus } from 'lucide-react';

interface EventDetailBodyProps {
    event: EventItem;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: () => void;
}

// Contenido con su propio estado: se recrea al cambiar de evento (key).
const EventDetailBody = ({
    event,
    onClose,
    onChanged,
    onDeleted,
}: EventDetailBodyProps) => {
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(
        null,
    );
    const [refreshNonce, setRefreshNonce] = useState(0);
    // Se refresca cuando cambia el número de inscritos, la inscripción propia,
    // o tras agregar/quitar a alguien manualmente.
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${event.registered}|${refreshNonce}`,
    );

    const ended = hasEnded(event);
    const full = isFull(event);
    const isDt = user?.roleId === ROLE_IDS.DT;
    const isAdmin = user?.roleId === ROLE_IDS.ADMIN;
    // Un DT puede inscribirse aunque esté completo: no ocupa plaza.
    const blockedByCapacity = full && !isDt && !event.registered;
    const colorStyle = ended
        ? { border: 'border-t-gray-400', tint: 'bg-gray-400/10' }
        : full
          ? { border: 'border-t-red-500', tint: 'bg-red-500/10' }
          : CATEGORY_COLOR_STYLES[event.category.color];

    // Al abrir la ficha de un evento completo, se avisa aunque el usuario
    // ya esté inscrito. El ref evita el doble aviso del StrictMode en dev.
    const notifiedFullRef = useRef(false);

    useEffect(() => {
        if ((full || ended) && !notifiedFullRef.current) {
            notifiedFullRef.current = true;
            toast.error(
                ended
                    ? 'Este evento ha finalizado.'
                    : 'Este evento está completo.',
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Solo oculta el botón: el servidor comprueba de nuevo quién puede eliminar.
    const canDelete =
        (user?.permissions.includes('events:delete') ?? false) &&
        (user?.roleId === ROLE_IDS.ADMIN || event.createdBy.id === user?.id);

    // "Agregar" exige poder ver candidatos y poder inscribirlos (la misma
    // llamada que carga el diálogo requiere attendees:view).
    const canAddAttendees =
        (user?.permissions.includes('attendees:view') ?? false) &&
        (user?.permissions.includes('attendees:add') ?? false);
    const canDeleteAttendees =
        user?.permissions.includes('attendees:delete') ?? false;

    const run = async (action: () => Promise<void>, success: string) => {
        setBusy(true);

        try {
            await action();

            toast.success(success);
            onChanged();
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo completar la acción',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {/* Mientras se confirma la eliminación se oculta la ficha. */}
            <Dialog
                open={
                    !confirmOpen &&
                    !seriesConfirmOpen &&
                    !participantsOpen &&
                    !addOpen &&
                    !deletingAttendee
                }
                onOpenChange={(open) => {
                    if (!open) onClose();
                }}
            >
                <DialogContent
                    className={cn('border-t-4 sm:max-w-lg', colorStyle.border)}
                >
                    <DialogHeader
                        className={cn(
                            '-mx-4 -mt-4 rounded-t-xl px-4 pt-4 pb-3',
                            colorStyle.tint,
                        )}
                    >
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
                        {full && !ended && (
                            <Badge variant="destructive">Completo</Badge>
                        )}
                        {ended && <Badge variant="outline">Finalizado</Badge>}
                    </div>

                    <EventInfoRows event={event} />

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

                    {event.description && (
                        <p className="text-sm whitespace-pre-line">
                            {event.description}
                        </p>
                    )}

                    <section
                        aria-labelledby="attendees-title"
                        className="grid gap-1.5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h3
                                id="attendees-title"
                                className="text-xs font-bold tracking-wide text-muted-foreground uppercase"
                            >
                                Inscritos ({event._count.registrations})
                            </h3>
                            {canAddAttendees && (
                                <IconTooltip label="Agregar participantes">
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        aria-label="Agregar participantes"
                                        onClick={() => setAddOpen(true)}
                                    >
                                        <UserPlus className="size-3.5" />
                                    </Button>
                                </IconTooltip>
                            )}
                        </div>
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
                                <AttendeeChips
                                    attendees={attendees}
                                    onDelete={
                                        canDeleteAttendees
                                            ? setDeletingAttendee
                                            : undefined
                                    }
                                />
                            </OverlayScrollbarsComponent>
                        )}
                    </section>
                    {ended && (
                        <Alert variant="destructive" className="bg-red-100">
                            <AlertCircle />
                            <AlertTitle>Evento finalizado</AlertTitle>
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

                        {ended && (
                            <Button
                                variant="default"
                                className="bg-green-800"
                                onClick={() => setParticipantsOpen(true)}
                            >
                                Usuarios atendidos
                            </Button>
                        )}

                        {isAdmin ? null : event.registered ? (
                            <Button
                                variant="default"
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
                                disabled={busy}
                                onClick={() => {
                                    if (ended) {
                                        toast.error(
                                            'Este evento ha finalizado.',
                                        );
                                        return;
                                    }

                                    if (blockedByCapacity) {
                                        toast.error(
                                            'Este evento está completo.',
                                        );
                                        return;
                                    }

                                    void run(
                                        () => registerForEventById(event.id),
                                        'Te has inscrito correctamente.',
                                    );
                                }}
                            >
                                {ended
                                    ? 'Finalizado'
                                    : blockedByCapacity
                                      ? 'Completo'
                                      : 'Inscribirme'}
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
                    onDeleted={onDeleted}
                />
            )}

            {canDelete && event.seriesId && (
                <DeleteEventSeriesDialog
                    event={event}
                    open={seriesConfirmOpen}
                    onOpenChange={setSeriesConfirmOpen}
                    onDeleted={() => onDeleted()}
                />
            )}
            <ParticipantsCountDialog
                open={participantsOpen}
                onOpenChange={setParticipantsOpen}
                event={event}
                onSaved={onChanged}
            />

            {canAddAttendees && (
                <AddParticipantsDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    eventId={event.id}
                    onAdded={() => {
                        setRefreshNonce((n) => n + 1);
                        onChanged();
                    }}
                />
            )}

            {deletingAttendee && (
                <ConfirmDeleteDialog
                    open={deletingAttendee !== null}
                    onOpenChange={(open) => !open && setDeletingAttendee(null)}
                    title="Quitar del evento"
                    description={`¿Quitar a «${deletingAttendee.name}» de este evento? Esta acción no se puede deshacer.`}
                    confirmLabel="Quitar"
                    deletingLabel="Quitando…"
                    errorFallback="No se pudo quitar al participante"
                    successLabel="Participante quitado."
                    onConfirm={() =>
                        adminUnregisterAttendee(event.id, deletingAttendee.id)
                    }
                    onDeleted={() => {
                        setRefreshNonce((n) => n + 1);
                        setDeletingAttendee(null);
                        onChanged();
                    }}
                />
            )}
        </>
    );
};

interface EventDetailDialogProps {
    event: EventItem | null;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: () => void;
}

export const EventDetailDialog = ({
    event,
    onClose,
    onChanged,
    onDeleted,
}: EventDetailDialogProps) => {
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
};
