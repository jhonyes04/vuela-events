import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { deleteDocument } from '@/features/resources/lib/documents';
import { deleteResourceLink } from '@/features/resources/lib/resourceLinks';
import type { Pending, ResourceRow } from '@/features/resources/pages/resourcesTable.types';

interface ResourceDeleteDialogProps {
    pending: Pending | null;
    onOpenChange: (open: boolean) => void;
    onDeleted: (result: { succeeded: ResourceRow[] }) => void;
}

export const ResourceDeleteDialog = ({
    pending,
    onOpenChange,
    onDeleted,
}: ResourceDeleteDialogProps) => {
    if (!pending) return null;

    return (
        <ConfirmDeleteDialog
            open={pending !== null}
            onOpenChange={onOpenChange}
            title="Eliminar recursos"
            description={`¿Eliminar ${pending.label}?`}
            confirmLabel="Eliminar"
            deletingLabel="Eliminando…"
            errorFallback="No se pudo eliminar el recurso"
            successLabel={({ succeeded, failed }) =>
                failed === 0
                    ? succeeded.length === 1
                        ? 'Recurso eliminado.'
                        : `${succeeded.length} recursos eliminados.`
                    : `${succeeded.length} eliminado${succeeded.length === 1 ? '' : 's'}, ${failed} en uso (no se pudo eliminar).`
            }
            onConfirm={async () => {
                const results = await Promise.allSettled(
                    pending.rows.map((row) =>
                        (row.kind === 'document'
                            ? deleteDocument(row.id)
                            : deleteResourceLink(row.id)
                        ).then(() => row),
                    ),
                );
                const succeeded = results
                    .filter(
                        (r): r is PromiseFulfilledResult<ResourceRow> =>
                            r.status === 'fulfilled',
                    )
                    .map((r) => r.value);
                const failed = pending.rows.length - succeeded.length;

                if (succeeded.length === 0) {
                    throw new Error('No se pudo eliminar');
                }

                return { succeeded, failed };
            }}
            onDeleted={onDeleted}
        />
    );
};
