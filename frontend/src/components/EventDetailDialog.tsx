import { useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { DeleteEventDialog } from '@/components/DeleteEventDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import {
    attendanceLabel,
    dayKey,
    formatDayLabel,
    formatTime,
    hasEnded,
    isFull,
    registerForEventById,
    unregisterFromEventById,
    type EventItem,
} from '@/lib/events';

type Feedback = { kind: 'error' | 'success'; message: string };

function Detail({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd>{children}</dd>
        </div>
    );
}

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
    onDeleted: (title: string) => void;
}) {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const ended = hasEnded(event);
    const isDt = user?.role === 'dt';
    // Un DT puede inscribirse aunque esté completo: no ocupa plaza.
    const blockedByCapacity = isFull(event) && !isDt && !event.registered;

    // Solo oculta el botón: el servidor comprueba de nuevo quién puede eliminar.
    const canDelete =
        user?.role === 'admin' ||
        (user?.role === 'dt' && event.createdBy.id === user.id);

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
                open={!confirmOpen}
                onOpenChange={(open) => {
                    if (!open) onClose();
                }}
            >
                <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{event.title}</DialogTitle>
                        <DialogDescription>
                            {event.subtitle ?? 'Detalle de la sesión'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-1.5">
                        {event.seriesId && <Badge variant="outline">Serie</Badge>}
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

                    <dl className="grid gap-3 text-sm">
                        <Detail label="Fecha">
                            {formatDayLabel(dayKey(event.startsAt))}
                            {', '}
                            {formatTime(event.startsAt)} –{' '}
                            {formatTime(event.endsAt)}
                        </Detail>
                        {event.location && (
                            <Detail label="Lugar">{event.location}</Detail>
                        )}
                        <Detail label="Organiza">{event.createdBy.name}</Detail>
                        <Detail label="Plazas">{attendanceLabel(event)}</Detail>
                        {event.description && (
                            <Detail label="Descripción">
                                <p className="whitespace-pre-line">
                                    {event.description}
                                </p>
                            </Detail>
                        )}
                    </dl>

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
                        {canDelete && (
                            <Button
                                variant="destructive"
                                className="sm:mr-auto"
                                disabled={busy}
                                onClick={() => setConfirmOpen(true)}
                            >
                                Eliminar sesión
                            </Button>
                        )}

                        {ended ? (
                            <p className="self-center text-sm text-muted-foreground">
                                Este evento ya ha finalizado.
                            </p>
                        ) : event.registered ? (
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
                    onDeleted={() => onDeleted(event.title)}
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
    onDeleted: (title: string) => void;
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
