import { useState, type SubmitEvent } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MERGE_TOKEN_RE = /^\{\{\w+\}\}$/;

// Admite una URL http(s) normal o un token de plantilla tipo {{enlacePerfil}},
// que el backend sustituye antes de enviar el correo.
const isValidLinkValue = (value: string): boolean => {
    if (MERGE_TOKEN_RE.test(value)) return true;

    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

export type LinkDialogMode = 'link' | 'button';

interface LinkDialogProps {
    mode: LinkDialogMode | null;
    initialValue: string;
    initialLabel: string;
    hasLink: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (url: string, label: string) => void;
    onRemove: () => void;
}

export const LinkDialog = ({
    mode,
    initialValue,
    initialLabel,
    hasLink,
    onOpenChange,
    onSubmit,
    onRemove,
}: LinkDialogProps) => {
    const [value, setValue] = useState(initialValue);
    const [label, setLabel] = useState(initialLabel);
    const [touched, setTouched] = useState(false);
    const [prevMode, setPrevMode] = useState(mode);
    const open = mode !== null;
    const isButton = mode === 'button';

    // Reinicia el formulario al abrir (nuevo mode tras estar en null): ajustar
    // estado durante el render evita el efecto y el render en cascada que
    // provocaba (ver react.dev "Adjusting state when a prop changes").
    if (mode !== prevMode) {
        setPrevMode(mode);

        if (mode !== null) {
            setValue(initialValue);
            setLabel(initialLabel);
            setTouched(false);
        }
    }

    const isUrlValid = isValidLinkValue(value);
    const isLabelValid = !isButton || label.trim().length > 0;
    const isValid = isUrlValid && isLabelValid;

    const handleSubmit = (e: SubmitEvent) => {
        // stopPropagation: este <form> vive dentro de un Dialog portado a
        // document.body, pero en el árbol de React sigue colgando del <form>
        // de la plantilla. Sin cortar la propagación, el submit sintético
        // burbujea hasta ese formulario exterior y lo envía también.
        e.preventDefault();
        e.stopPropagation();
        setTouched(true);
        if (!isValid) return;
        onSubmit(value.trim(), label.trim());
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && (
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === 'button'
                                ? 'Insertar botón'
                                : 'Insertar enlace'}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        id="link-dialog-form"
                        onSubmit={handleSubmit}
                        className="grid gap-1.5"
                        noValidate
                    >
                        {isButton && (
                            <>
                                <Label htmlFor="link-dialog-label">
                                    Texto del botón
                                </Label>
                                <Input
                                    id="link-dialog-label"
                                    autoFocus
                                    placeholder="Ir a mi perfil"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    onBlur={() => setTouched(true)}
                                    aria-invalid={touched && !isLabelValid}
                                />
                                {touched && !isLabelValid && (
                                    <p className="text-sm text-destructive">
                                        Escribe el texto del botón.
                                    </p>
                                )}
                            </>
                        )}
                        <Label htmlFor="link-dialog-url">URL</Label>
                        <Input
                            id="link-dialog-url"
                            autoFocus={!isButton}
                            placeholder="https://… o {{token}}"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={() => setTouched(true)}
                            aria-invalid={touched && !isUrlValid}
                        />
                        {touched && !isUrlValid && (
                            <p className="text-sm text-destructive">
                                Introduce una URL válida (http/https) o un token
                                de plantilla, p. ej. {'{{enlace}}'}.
                            </p>
                        )}
                    </form>
                    <DialogFooter>
                        {hasLink && (
                            <Button
                                type="button"
                                variant="outline"
                                className="mr-auto"
                                onClick={onRemove}
                            >
                                Quitar enlace
                            </Button>
                        )}
                        <Button type="submit" form="link-dialog-form">
                            Insertar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    );
};
