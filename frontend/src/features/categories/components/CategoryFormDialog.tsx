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
import { cn } from '@/lib/utils';
import {
    createCategory,
    updateCategory,
    type Category,
} from '@/features/categories/lib/categories';
import {
    CATEGORY_COLORS,
    CATEGORY_COLOR_STYLES,
    type CategoryColor,
} from '@/features/categories/lib/colors';

interface CategoryFormBodyProps {
    category: Category | null;
    onSaved: (category: Category) => void;
    onClose: () => void;
}

// Con su propio estado: el padre la remonta (key) cada vez que abre el diálogo.
const CategoryFormBody = ({
    category,
    onSaved,
    onClose,
}: CategoryFormBodyProps) => {
    const [name, setName] = useState(category?.name ?? '');
    const [color, setColor] = useState<CategoryColor>(
        category?.color ?? CATEGORY_COLORS[0],
    );
    const [active, setActive] = useState(category?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const saved = category
                ? await updateCategory(category.id, { name, color, active })
                : await createCategory({ name, color });

            toast.success(
                category ? 'Categoría actualizada.' : 'Categoría creada.',
            );
            onSaved(saved);
            onClose();
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar la categoría',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {category ? 'Editar categoría' : 'Nueva categoría'}
                </DialogTitle>
                <DialogDescription>
                    El color se usa para diferenciarla en el calendario.
                </DialogDescription>
            </DialogHeader>

            <form
                id="category-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="category-name">Nombre *</Label>
                    <Input
                        id="category-name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <fieldset className="grid gap-1.5">
                    <legend className="mb-1.5 text-sm font-medium">
                        Color
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORY_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={CATEGORY_COLOR_STYLES[c].label}
                                aria-pressed={color === c}
                                onClick={() => setColor(c)}
                                className={cn(
                                    'size-8 rounded-full ring-offset-2 ring-offset-background',
                                    CATEGORY_COLOR_STYLES[c].swatch,
                                    color === c
                                        ? 'ring-2 ring-ring'
                                        : 'hover:ring-2 hover:ring-border',
                                )}
                            />
                        ))}
                    </div>
                </fieldset>

                {category && (
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

            </form>

            <DialogFooter>
                <Button
                    type="submit"
                    form="category-form"
                    disabled={submitting}
                >
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface CategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, categoría = editar.
    category: Category | null;
    onSaved: (category: Category) => void;
}

export const CategoryFormDialog = ({
    open,
    onOpenChange,
    category,
    onSaved,
}: CategoryFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <CategoryFormBody
            category={category}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
        />
    </Dialog>
);
