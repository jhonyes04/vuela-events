import { Button, buttonVariants } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
    googleCalendarUrl,
    type EventItem,
} from '@/features/events/lib/events';

interface EventDetailFooterProps {
    event: EventItem;
    busy: boolean;
    ended: boolean;
    isAdmin: boolean;
    canDelete: boolean;
    blockedByCapacity: boolean;
    onDeleteClick: () => void;
    onDeleteSeriesClick: () => void;
    onParticipantsClick: () => void;
    onRegisterClick: () => void;
    onUnregisterClick: () => void;
}

export const EventDetailFooter = ({
    event,
    busy,
    ended,
    isAdmin,
    canDelete,
    blockedByCapacity,
    onDeleteClick,
    onDeleteSeriesClick,
    onParticipantsClick,
    onRegisterClick,
    onUnregisterClick,
}: EventDetailFooterProps) => (
    <DialogFooter>
        <div className="flex gap-2 ms-auto">
            {canDelete && (
                <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={onDeleteClick}
                >
                    Eliminar sesión
                </Button>
            )}

            {canDelete && event.seriesId && (
                <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={onDeleteSeriesClick}
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
                className={buttonVariants({ variant: 'secondary' })}
            >
                Añadir a Google Calendar
            </a>
        )}

        {ended && (
            <Button
                variant="default"
                className="bg-green-800"
                onClick={onParticipantsClick}
            >
                Usuarios atendidos
            </Button>
        )}

        {isAdmin || ended ? null : event.registered ? (
            <Button
                variant="default"
                disabled={busy}
                onClick={onUnregisterClick}
            >
                Cancelar inscripción
            </Button>
        ) : (
            <Button disabled={busy} onClick={onRegisterClick}>
                {blockedByCapacity ? 'Completo' : 'Inscribirme'}
            </Button>
        )}
    </DialogFooter>
);
