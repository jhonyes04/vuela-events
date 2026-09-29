import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/features/events/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog';
import {
    CATEGORY_COLOR_STYLES,
    deleteCategory,
    listCategories,
    type Category,
} from '@/features/categories/lib/categories';
import { ApiError } from '@/lib/api';

export const CategoriesPage = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setCategories(await listCategories());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (category: Category) => {
        setEditing(category);
        setFormOpen(true);
    };

    const handleSaved = (category: Category) => {
        setCategories((prev) => {
            const exists = prev.some((c) => c.id === category.id);

            return (
                exists
                    ? prev.map((c) => (c.id === category.id ? category : c))
                    : [...prev, category]
            ).sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Categorías</h1>
                <Button onClick={openCreate}>Nueva categoría</Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando categorías…
                </p>
            ) : categories.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay categorías.
                </p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {categories.map((category) => (
                        <li
                            key={category.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-4"
                        >
                            <span
                                className={`size-4 shrink-0 rounded-full ${CATEGORY_COLOR_STYLES[category.color].swatch}`}
                            />
                            <span className="flex-1 truncate font-medium">
                                {category.name}
                            </span>
                            {!category.active && (
                                <Badge variant="secondary">Inactiva</Badge>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(category)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Eliminar"
                                onClick={() => setDeleting(category)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <CategoryFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                category={editing}
                onSaved={handleSaved}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar categoría"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar la categoría"
                    onConfirm={() => deleteCategory(deleting.id)}
                    onDeleted={() => {
                        setCategories((prev) =>
                            prev.filter((c) => c.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
