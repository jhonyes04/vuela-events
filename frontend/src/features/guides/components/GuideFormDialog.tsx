import { useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const saved = guide
                ? await updateGuide(guide.id, { name, url, active })
                : await createGuide({ name, url });

            toast.success(guide ? 'Guía actualizada.' : 'Guía creada.');
            onSaved(saved);
            onClose();
        } catch (error) {
            toast.error(
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
                        <Checkbox
                            checked={active}
                            disabled={submitting}
                            onCheckedChange={setActive}
                        />
                        {active ? 'Activa' : 'Desactivada'}
                    </label>
                )}
            </form>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
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
        {open && (
            <GuideFormBody
                key={guide?.id ?? 'new'}
                guide={guide}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
