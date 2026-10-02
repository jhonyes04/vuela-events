import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
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

interface ConfirmDeleteDialogProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    deletingLabel: string;
    errorFallback: string;
    // Texto del toast al eliminar; puede depender del resultado de onConfirm.
    successLabel: string | ((result: T) => string);
    onConfirm: () => Promise<T>;
    onDeleted: (result: T) => void;
}

export function ConfirmDeleteDialog<T>({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    deletingLabel,
    errorFallback,
    successLabel,
    onConfirm,
    onDeleted,
}: ConfirmDeleteDialogProps<T>) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);

        try {
            const result = await onConfirm();

            onOpenChange(false);
            onDeleted(result);
            toast.success(
                typeof successLabel === 'function'
                    ? successLabel(result)
                    : successLabel,
            );
        } catch (error) {
            toast.error('No se pudo eliminar', {
                description:
                    error instanceof ApiError ? error.message : errorFallback,
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        variant="default"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                    >
                        {deleting ? deletingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
