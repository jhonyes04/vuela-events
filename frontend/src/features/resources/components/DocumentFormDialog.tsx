import { useState, type FormEvent } from 'react';
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
import { ApiError } from '@/lib/api';
import {
    createDocument,
    readFileAsBase64,
    updateDocument,
    type Document,
} from '@/features/resources/lib/documents';

interface DocumentFormBodyProps {
    document: Document | null;
    onSaved: (document: Document) => void;
    onClose: () => void;
}

const DocumentFormBody = ({
    document,
    onSaved,
    onClose,
}: DocumentFormBodyProps) => {
    const [title, setTitle] = useState(document?.title ?? '');
    const [active, setActive] = useState(document?.active ?? true);
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!document && !file) {
            toast.error('Selecciona un archivo');
            return;
        }

        setSubmitting(true);

        try {
            const fileData = file ? await readFileAsBase64(file) : null;

            const saved = document
                ? await updateDocument(document.id, {
                      title,
                      active,
                      ...(fileData && {
                          fileName: file!.name,
                          contentType: fileData.contentType,
                          dataBase64: fileData.dataBase64,
                      }),
                  })
                : await createDocument({
                      title,
                      fileName: file!.name,
                      contentType: fileData!.contentType,
                      dataBase64: fileData!.dataBase64,
                  });

            toast.success(
                document ? 'Documento actualizado.' : 'Documento creado.',
            );
            onSaved(saved);
            onClose();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar el documento',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {document ? 'Editar documento' : 'Nuevo documento'}
                </DialogTitle>
                <DialogDescription>
                    PDF, Word, Excel u OpenDocument (.odt/.ods/.odp), máximo
                    10MB.
                </DialogDescription>
            </DialogHeader>

            <form
                id="document-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="document-title">Título *</Label>
                    <Input
                        id="document-title"
                        required
                        minLength={2}
                        maxLength={100}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="document-file">
                        Archivo {document ? '(opcional, para reemplazarlo)' : '*'}
                    </Label>
                    <Input
                        id="document-file"
                        type="file"
                        required={!document}
                        accept=".pdf,.docx,.xlsx,.odt,.ods,.odp"
                        onChange={(e) =>
                            setFile(e.target.files?.[0] ?? null)
                        }
                    />
                    {document && (
                        <p className="text-xs text-muted-foreground">
                            Archivo actual: {document.fileName}
                        </p>
                    )}
                </div>

                {document && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        Activo
                    </label>
                )}
            </form>

            <DialogFooter>
                <Button type="submit" form="document-form" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface DocumentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: Document | null;
    onSaved: (document: Document) => void;
}

export const DocumentFormDialog = ({
    open,
    onOpenChange,
    document,
    onSaved,
}: DocumentFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <DocumentFormBody
                key={document?.id ?? 'new'}
                document={document}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
