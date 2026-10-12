import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ApiError } from '@/lib/api';
import {
    getEmailSignature,
    resolveSignatureImages,
    saveEmailSignature,
    SIGNATURE_IMAGE_MAX_BYTES,
    SIGNATURE_IMAGE_TYPES,
    uploadEmailSignatureImage,
} from '@/features/profile/lib/profile';

// Lo que deja el editor vacío; el servidor guarda la firma vacía como null.
const EMPTY_EDITOR_HTML = '<p></p>';

export const EmailSignatureSection = () => {
    const [savedHtml, setSavedHtml] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getEmailSignature()
            .then((html) => {
                setSavedHtml(html);
                setDraft(html);
            })
            .catch(() => setLoadFailed(true));
    }, []);

    const uploadImage = async (file: File): Promise<string | null> => {
        if (!SIGNATURE_IMAGE_TYPES.includes(file.type)) {
            toast.error('La imagen debe ser PNG, JPG o WebP');
            return null;
        }

        if (file.size > SIGNATURE_IMAGE_MAX_BYTES) {
            toast.error('La imagen debe pesar menos de 300KB');
            return null;
        }

        try {
            return await uploadEmailSignatureImage(file);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo subir la imagen',
            );
            return null;
        }
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            // Sube las imágenes pegadas antes de guardar: el servidor descarta las que no son propias.
            const resolved = await resolveSignatureImages(
                draft === EMPTY_EDITOR_HTML ? '' : draft,
            );
            const html = await saveEmailSignature(resolved.html);

            setSavedHtml(html);
            setDraft(html);

            if (resolved.skipped > 0) {
                toast.error(
                    `${resolved.skipped} imagen(es) no se pudieron guardar. Súbelas con el botón de imagen.`,
                );
            } else {
                toast.success('Firma de correo guardada.');
            }
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar la firma de correo',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loadFailed) {
        return (
            <p className="text-sm text-destructive">
                No se pudo cargar la firma de correo.
            </p>
        );
    }

    if (savedHtml === null) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Cargando firma de correo…
            </p>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">Firma de correo</h2>
                <p className="text-sm text-muted-foreground">
                    Se añade al final de las convocatorias y partes de firmas
                    que envías. Puedes incluir imágenes (PNG, JPG o WebP, máximo
                    300KB).
                </p>
            </div>

            {/* key: tras guardar, el editor se recrea con el HTML ya saneado y con las rutas del servidor. */}
            <RichTextEditor
                key={savedHtml}
                value={savedHtml}
                onChange={setDraft}
                onImageUpload={uploadImage}
            />

            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={saving || draft === savedHtml}
                    onClick={() => void handleSave()}
                >
                    {saving ? 'Guardando…' : 'Guardar firma'}
                </Button>
            </div>
        </div>
    );
};
