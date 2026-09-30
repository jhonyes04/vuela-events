import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import {
    dayKey,
    deleteEventById,
    formatDayLabel,
    formatTime,
    type EventItem,
} from '@/features/events/lib/events';

interface DeleteEventDialogProps {
    event: EventItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: () => void;
}

export const DeleteEventDialog = ({
    event,
    open,
    onOpenChange,
    onDeleted,
}: DeleteEventDialogProps) => {
    const registrations = event._count.registrations;

    return (
        <ConfirmDeleteDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Eliminar sesión"
            description={
                <>
                    ¿Eliminar «{event.title}» del{' '}
                    {formatDayLabel(dayKey(event.startsAt))} a las{' '}
                    {formatTime(event.startsAt)}?{' '}
                    {registrations > 0
                        ? registrations === 1
                            ? 'Se perderá 1 inscripción. '
                            : `Se perderán ${registrations} inscripciones. `
                        : ''}
                    {event.seriesId
                        ? 'Solo se elimina esta fecha; las demás no cambian. '
                        : ''}
                    Esta acción no se puede deshacer.
                </>
            }
            confirmLabel="Eliminar"
            deletingLabel="Eliminando…"
            errorFallback="No se pudo eliminar la sesión"
            onConfirm={() => deleteEventById(event.id)}
            onDeleted={onDeleted}
        />
    );
};
