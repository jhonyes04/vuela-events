import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/RichTextEditor';

interface MeetingMotivoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    motivo: string;
    onMotivoChange: (value: string) => void;
    onContinue: () => void;
}

// Solo para la convocatoria de un proyecto de reuniones comarcales: detalle
// suelto para ese envío concreto, no se guarda en ningún lado.
export const MeetingMotivoDialog = ({
    open,
    onOpenChange,
    motivo,
    onMotivoChange,
    onContinue,
}: MeetingMotivoDialogProps) => {
    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detalles de la reunión</DialogTitle>
                    <DialogDescription>
                        Opcional: añade algo más para esta convocatoria. Solo se
                        usa para este envío, no se guarda.
                    </DialogDescription>
                </DialogHeader>

                <RichTextEditor
                    value={motivo}
                    onChange={onMotivoChange}
                    contentClassName="min-h-50"
                />

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button type="button" onClick={onContinue}>
                        Continuar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
