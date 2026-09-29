import { useState, type ReactNode } from 'react';
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

interface ConfirmDeleteDialogProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    deletingLabel: string;
    errorFallback: string;
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
    onConfirm,
    onDeleted,
}: ConfirmDeleteDialogProps<T>) {
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
            const result = await onConfirm();

            onOpenChange(false);
            onDeleted(result);
        } catch (error) {
            setError(error instanceof ApiError ? error.message : errorFallback);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
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
                        {deleting ? deletingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
