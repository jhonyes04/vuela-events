import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { config } from '@/config';
import { ApiError, type User } from '@/lib/api';
import {
    clearSignatureImage,
    setSignatureImage,
} from '@/features/profile/lib/profile';
import { SignatureCanvas } from '@/features/profile/components/SignatureCanvas';

const MAX_FILE_BYTES = 300 * 1024;

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result as string;

            resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

export function SignatureSection({
    user,
    onSaved,
}: {
    user: User;
    onSaved: (configured: boolean) => void;
}) {
    const [submitting, setSubmitting] = useState(false);
    const [previewVersion, setPreviewVersion] = useState(0);
    const [drawOpen, setDrawOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSaveBase64 = async (imageBase64: string) => {
        setDrawOpen(false);
        setSubmitting(true);

        try {
            const configured = await setSignatureImage(imageBase64);

            setDrawOpen(false);
            setPreviewVersion((v) => v + 1);
            toast.success('Firma guardada.');
            onSaved(configured);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar la firma',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = async (file: File) => {
        if (file.type !== 'image/png') {
            toast.error('La imagen debe ser un PNG');
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            toast.error('La imagen debe pesar menos de 300KB');
            return;
        }

        const imageBase64 = await fileToBase64(file);

        await handleSaveBase64(imageBase64);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleClear = async () => {
        setSubmitting(true);

        try {
            const configured = await clearSignatureImage();

            toast.success('Firma eliminada.');
            onSaved(configured);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo quitar la firma',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">
                    Firma para el acta de asistencia
                </h2>
                <p className="text-sm text-muted-foreground">
                    Imagen PNG de tu firma (recorta solo el trazo, fondo
                    transparente si puedes). Se estampa en el acta de asistencia
                    que se genera al enviar el parte de firmas.
                </p>
            </div>

            {user.signatureConfigured ? (
                <div className="grid gap-2">
                    <img
                        key={previewVersion}
                        src={`${config.apiBase}/profile/signature-image?v=${previewVersion}`}
                        alt="Firma guardada"
                        className="mx-auto block h-16 w-fit rounded-lg border bg-white object-contain p-2"
                    />
                    <Alert>
                        <CircleCheck />
                        <AlertTitle>Configurada</AlertTitle>
                    </Alert>
                </div>
            ) : (
                <Alert>
                    <CircleAlert />
                    <AlertTitle>No configurada</AlertTitle>
                </Alert>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) void handleFileChange(file);
                }}
            />

            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => inputRef.current?.click()}
                >
                    {submitting ? 'Guardando…' : 'Subir imagen'}
                </Button>
                <Button
                    type="button"
                    variant="default"
                    disabled={submitting}
                    onClick={() => setDrawOpen(true)}
                >
                    Crear firma
                </Button>
                {user.signatureConfigured && (
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={submitting}
                        className="w-fit"
                        onClick={() => void handleClear()}
                    >
                        Quitar
                    </Button>
                )}
            </div>

            <Dialog open={drawOpen} onOpenChange={setDrawOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear firma</DialogTitle>
                        <DialogDescription>
                            Dibuja tu firma con el ratón o el dedo.
                        </DialogDescription>
                    </DialogHeader>
                    <SignatureCanvas
                        onSave={(imageBase64) =>
                            void handleSaveBase64(imageBase64)
                        }
                        saving={submitting}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
