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
    createResourceLink,
    updateResourceLink,
    type ResourceLink,
} from '@/features/resources/lib/resourceLinks';

interface ResourceLinkFormBodyProps {
    link: ResourceLink | null;
    onSaved: (link: ResourceLink) => void;
    onClose: () => void;
}

const ResourceLinkFormBody = ({
    link,
    onSaved,
    onClose,
}: ResourceLinkFormBodyProps) => {
    const [title, setTitle] = useState(link?.title ?? '');
    const [url, setUrl] = useState(link?.url ?? '');
    const [active, setActive] = useState(link?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const saved = link
                ? await updateResourceLink(link.id, { title, url, active })
                : await createResourceLink({ title, url });

            toast.success(link ? 'Enlace actualizado.' : 'Enlace creado.');
            onSaved(saved);
            onClose();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar el enlace',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {link ? 'Editar enlace' : 'Nuevo enlace'}
                </DialogTitle>
                <DialogDescription>
                    El enlace se abrirá en una pestaña nueva.
                </DialogDescription>
            </DialogHeader>

            <form
                id="resource-link-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="resource-link-title">Título *</Label>
                    <Input
                        id="resource-link-title"
                        required
                        minLength={2}
                        maxLength={100}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="resource-link-url">URL *</Label>
                    <Input
                        id="resource-link-url"
                        type="url"
                        required
                        maxLength={2048}
                        placeholder="https://…"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

                {link && (
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
                <Button
                    type="submit"
                    form="resource-link-form"
                    disabled={submitting}
                >
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface ResourceLinkFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, enlace = editar.
    link: ResourceLink | null;
    onSaved: (link: ResourceLink) => void;
}

export const ResourceLinkFormDialog = ({
    open,
    onOpenChange,
    link,
    onSaved,
}: ResourceLinkFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <ResourceLinkFormBody
                key={link?.id ?? 'new'}
                link={link}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
