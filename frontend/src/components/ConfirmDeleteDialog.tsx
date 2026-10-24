import { useState, type ReactNode } from 'react';
import { CircleXIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';

interface ConfirmDeleteDialogProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    deletingLabel: string;
    errorFallback: string;
    successLabel: string | ((result: T) => string);
    onConfirm: () => Promise<T>;
    onDeleted: (result: T) => void;
    confirmText?: string;
    textField?: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    };
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
    confirmText,
    textField,
}: ConfirmDeleteDialogProps<T>) {
    const [deleting, setDeleting] = useState(false);
    const [typed, setTyped] = useState('');

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
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <CircleXIcon className="size-6 text-destructive" />
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {description}
                        <br />
                        Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>

                {textField && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="confirm-delete-text-field">
                            {textField.label}
                        </Label>
                        <Textarea
                            id="confirm-delete-text-field"
                            autoComplete="off"
                            maxLength={300}
                            value={textField.value}
                            placeholder={textField.placeholder}
                            onChange={(e) => textField.onChange(e.target.value)}
                        />
                    </div>
                )}

                {confirmText !== undefined && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="confirm-delete-text">
                            Escribe «{confirmText}» para confirmar
                        </Label>
                        <Input
                            id="confirm-delete-text"
                            autoComplete="off"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                        />
                    </div>
                )}

                <DialogFooter className="bg-destructive/20">
                    <Button
                        variant="default"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="default"
                        className="bg-destructive"
                        disabled={
                            deleting ||
                            (confirmText !== undefined && typed !== confirmText)
                        }
                        onClick={() => void handleDelete()}
                    >
                        {deleting ? deletingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
