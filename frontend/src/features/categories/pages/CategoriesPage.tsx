import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog';
import {
    deleteCategory,
    type Category,
} from '@/features/categories/lib/categories';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import { useCategoriesStore } from '@/features/categories/store';

export const CategoriesPage = () => {
    const categories = useCategoriesStore((s) => s.items);
    const loading = useCategoriesStore((s) => s.loading);
    const error = useCategoriesStore((s) => s.error);
    const load = useCategoriesStore((s) => s.load);
    const upsert = useCategoriesStore((s) => s.upsert);
    const remove = useCategoriesStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (category: Category) => {
        setEditing(category);
        setFormKey((k) => k + 1);
        setFormOpen(true);
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
                onRetry={() => void load(true)}
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
                            <IconTooltip label="Editar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Editar"
                                    onClick={() => openEdit(category)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </IconTooltip>
                            <IconTooltip label="Eliminar">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    onClick={() => setDeleting(category)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        </li>
                    ))}
                </ul>
            )}

            <CategoryFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                category={editing}
                onSaved={upsert}
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
                    successLabel={`Categoría «${deleting.name}» eliminada.`}
                    onConfirm={() => deleteCategory(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
