import { Download, ExternalLink, Printer } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PdfCanvasPreview } from '@/features/reports/components/PdfCanvasPreview';
import { Card, CardContent } from '@/components/ui/card';

interface ReportPreviewDialogProps {
    title: string;
    subtitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
    filename: string;
}

// Imprime el PDF desde un iframe oculto, sin depender del visor del navegador.
const printPdf = (url: string) => {
    const iframe = document.createElement('iframe');

    iframe.className = 'fixed -top-full left-0 h-0 w-0 border-0';
    iframe.src = url;

    iframe.onload = () => {
        iframe.contentWindow?.print();
    };

    document.body.appendChild(iframe);
};

export const ReportPreviewDialog = ({
    title,
    subtitle,
    open,
    onOpenChange,
    url,
    filename,
}: ReportPreviewDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>

            <Card>
                <CardContent>
                    <PdfCanvasPreview
                        url={url}
                        title={filename}
                        className="h-[60vh] w-full"
                    />
                </CardContent>
            </Card>

            <DialogFooter>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buttonVariants({ variant: 'secondary' })} sm:me-auto`}
                >
                    <ExternalLink className="size-4" />
                    Abrir en otra pestaña
                </a>
                <a
                    href={url}
                    download={filename}
                    className={buttonVariants({ variant: 'secondary' })}
                >
                    <Download className="size-4" />
                    Descargar
                </a>
                <Button variant="secondary" onClick={() => printPdf(url)}>
                    <Printer className="size-4" />
                    Imprimir
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                    Todo correcto
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
