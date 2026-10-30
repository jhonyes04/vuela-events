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

interface MeetingTextDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    value: string;
    onValueChange: (value: string) => void;
    onContinue: () => void;
}

// Genérico, para los pasos opcionales de un proyecto de reuniones comarcales
// (motivo de la convocatoria, contenido del parte de asistencia...): el
// texto solo se usa en ese paso concreto, no se guarda en ningún lado.
export const MeetingTextDialog = ({
    open,
    onOpenChange,
    title,
    description,
    value,
    onValueChange,
    onContinue,
}: MeetingTextDialogProps) => {
    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <RichTextEditor
                    value={value}
                    onChange={onValueChange}
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
