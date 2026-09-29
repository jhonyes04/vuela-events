import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import {
    deleteEventSeriesById,
    type EventItem,
} from '@/features/events/lib/events';

interface DeleteEventSeriesDialogProps {
    event: EventItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: (deletedCount: number) => void;
}

export const DeleteEventSeriesDialog = ({
    event,
    open,
    onOpenChange,
    onDeleted,
}: DeleteEventSeriesDialogProps) => (
    <ConfirmDeleteDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Eliminar toda la serie"
        description={
            <>
                Se eliminarán todas las sesiones futuras de «{event.title}» (las
                que ya han pasado no se tocan). Esta acción no se puede
                deshacer.
            </>
        }
        confirmLabel="Eliminar serie"
        deletingLabel="Eliminando…"
        errorFallback="No se pudo eliminar la serie"
        onConfirm={async () => {
            const { deletedCount } = await deleteEventSeriesById(
                event.seriesId!,
            );

            return deletedCount;
        }}
        onDeleted={onDeleted}
    />
);
