import { ExternalLink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ReportPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
    filename: string;
}

// Visualiza el parte de firmas generado, tal y como se va a enviar.
export const ReportPreviewDialog = ({
    open,
    onOpenChange,
    url,
    filename,
}: ReportPreviewDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Parte de firmas generado</DialogTitle>
                <DialogDescription>
                    Revisa el acta antes de enviarla: es exactamente el PDF que
                    recibirán los destinatarios.
                </DialogDescription>
            </DialogHeader>

            <iframe
                src={url}
                title={filename}
                className="h-[60vh] w-full rounded-lg border bg-white"
            />

            <DialogFooter>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'secondary' })}
                >
                    <ExternalLink className="size-4" />
                    Abrir en otra pestaña
                </a>
                <Button onClick={() => onOpenChange(false)}>
                    Todo correcto
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
