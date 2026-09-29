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
import { deleteEventSeriesById, type EventItem } from '@/features/events/lib/events';

export function DeleteEventSeriesDialog({
    event,
    open,
    onOpenChange,
    onDeleted,
}: {
    event: EventItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: (deletedCount: number) => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleOpenChange = (next: boolean) => {
        if (next) setError(null);

        onOpenChange(next);
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            const { deletedCount } = await deleteEventSeriesById(
                event.seriesId!,
            );

            onOpenChange(false);
            onDeleted(deletedCount);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo eliminar la serie',
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eliminar toda la serie</DialogTitle>
                    <DialogDescription>
                        Se eliminarán todas las sesiones futuras de «
                        {event.title}» (las que ya han pasado no se tocan).
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
                        {deleting ? 'Eliminando…' : 'Eliminar serie'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
