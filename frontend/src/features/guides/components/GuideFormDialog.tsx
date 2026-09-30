import { useState, type FormEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import {
    createGuide,
    updateGuide,
    type Guide,
} from '@/features/guides/lib/guides';

interface GuideFormBodyProps {
    guide: Guide | null;
    onSaved: (guide: Guide) => void;
    onClose: () => void;
}

const GuideFormBody = ({ guide, onSaved, onClose }: GuideFormBodyProps) => {
    const [name, setName] = useState(guide?.name ?? '');
    const [url, setUrl] = useState(guide?.url ?? '');
    const [active, setActive] = useState(guide?.active ?? true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const saved = guide
                ? await updateGuide(guide.id, { name, url, active })
                : await createGuide({ name, url });

            onSaved(saved);
            onClose();
        } catch (error) {
            setError(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar la guía',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {guide ? 'Editar guía' : 'Nueva guía'}
                </DialogTitle>
                <DialogDescription>
                    El enlace se abrirá en una pestaña nueva.
                </DialogDescription>
            </DialogHeader>

            <form
                id="guide-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="guide-name">Nombre *</Label>
                    <Input
                        id="guide-name"
                        required
                        minLength={2}
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="guide-url">URL *</Label>
                    <Input
                        id="guide-url"
                        type="url"
                        required
                        maxLength={2048}
                        placeholder="https://…"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

                {guide && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        Activa
                    </label>
                )}

                {error && (
                    <Alert variant="destructive">
                        <CircleAlert />
                        <AlertTitle>No se pudo guardar</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </form>

            <DialogFooter>
                <Button type="submit" form="guide-form" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface GuideFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, guía = editar.
    guide: Guide | null;
    onSaved: (guide: Guide) => void;
}

export const GuideFormDialog = ({
    open,
    onOpenChange,
    guide,
    onSaved,
}: GuideFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <GuideFormBody
            key={guide?.id ?? 'new'}
            guide={guide}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
        />
    </Dialog>
);
