import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    dayKey,
    deleteEventById,
    formatDayLabel,
    formatTime,
    type EventItem,
} from '@/lib/events';

export function DeleteEventDialog({
    event,
    open,
    onOpenChange,
    onDeleted,
}: {
    event: EventItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const registrations = event._count.registrations;

    const handleOpenChange = (next: boolean) => {
        if (next) setError(null);

        onOpenChange(next);
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            await deleteEventById(event.id);

            onOpenChange(false);
            onDeleted();
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo eliminar la sesión',
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eliminar sesión</DialogTitle>
                    <DialogDescription>
                        ¿Eliminar «{event.title}» del{' '}
                        {formatDayLabel(dayKey(event.startsAt))} a las{' '}
                        {formatTime(event.startsAt)}?{' '}
                        {registrations > 0
                            ? registrations === 1
                                ? 'Se perderá 1 inscripción. '
                                : `Se perderán ${registrations} inscripciones. `
                            : ''}
                        {event.seriesId
                            ? 'Solo se elimina esta sesión; el resto de la serie no cambia. '
                            : ''}
                        Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <CircleAlert />
                        <AlertTitle>No se pudo eliminar</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                    >
                        {deleting ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
