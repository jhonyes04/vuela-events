import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import {
    listCategoryInterests,
    removeCategoryInterestedUser,
    type CategoryInterests,
} from '@/features/categories/lib/categories';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import { AddCategoryInterestDialog } from '@/features/categories/components/AddCategoryInterestDialog';
import { personLabel } from '@/features/events/lib/events';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';

interface DeletingTarget {
    categoryId: string;
    userId: string;
    label: string;
}

export const CategoryInterestsPage = () => {
    const { user } = useAuth();
    const canAdd = user?.permissions.includes('categories:edit') ?? false;
    const canDelete = user?.permissions.includes('categories:delete') ?? false;

    const [categories, setCategories] = useState<CategoryInterests[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingFor, setAddingFor] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<DeletingTarget | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setCategories(await listCategoryInterests());
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

    return (
        <section>
            <PageTitle>Usuarios por categoría</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando…
                </p>
            ) : categories.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay categorías.
                </p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {categories.map((category) => {
                        const colorStyle =
                            CATEGORY_COLOR_STYLES[category.color];

                        return (
                            <Card
                                key={category.id}
                                className={cn(
                                    'gap-0 overflow-hidden border-t-4 py-0',
                                    colorStyle.border,
                                )}
                            >
                                <CardHeader
                                    className={cn(
                                        'flex items-center justify-between px-4! py-4!',
                                        colorStyle.tint,
                                    )}
                                >
                                    <h3 className="font-heading text-base leading-snug font-semibold">
                                        {category.name}
                                    </h3>
                                    {canAdd && (
                                        <IconTooltip label="Agregar usuario">
                                            <Button
                                                variant="secondary"
                                                size="icon-sm"
                                                aria-label="Agregar usuario"
                                                onClick={() =>
                                                    setAddingFor(category.id)
                                                }
                                            >
                                                <UserPlus className="size-3.5" />
                                            </Button>
                                        </IconTooltip>
                                    )}
                                </CardHeader>
                                <CardContent className="px-4! py-4!">
                                    {category.users.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Nadie ha marcado interés todavía.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-1 text-sm">
                                            {category.users.map((u) => (
                                                <li
                                                    key={u.id}
                                                    className="flex items-center gap-2 rounded-md bg-card px-2 py-1"
                                                >
                                                    <span className="min-w-0 flex-1 break-words">
                                                        {personLabel({
                                                            name: `${u.name}`,
                                                            puntoVuela:
                                                                u.puntoVuela,
                                                        })}
                                                    </span>
                                                    {canDelete && (
                                                        <IconTooltip label="Quitar">
                                                            <Button
                                                                variant="destructive"
                                                                size="icon-sm"
                                                                aria-label={`Quitar a ${u.name}`}
                                                                onClick={() =>
                                                                    setDeleting(
                                                                        {
                                                                            categoryId:
                                                                                category.id,
                                                                            userId: u.id,
                                                                            label: `${u.name} ${u.lastName}`,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </IconTooltip>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {addingFor && (
                <AddCategoryInterestDialog
                    open={addingFor !== null}
                    onOpenChange={(open) => !open && setAddingFor(null)}
                    categoryId={addingFor}
                    currentUserIds={
                        new Set(
                            categories
                                .find((c) => c.id === addingFor)
                                ?.users.map((u) => u.id) ?? [],
                        )
                    }
                    onAdded={setCategories}
                />
            )}

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Quitar de la categoría"
                    description={`¿Quitar a «${deleting.label}» de esta categoría? Esta acción no se puede deshacer.`}
                    confirmLabel="Quitar"
                    deletingLabel="Quitando…"
                    errorFallback="No se pudo quitar al usuario"
                    successLabel="Usuario quitado."
                    onConfirm={() =>
                        removeCategoryInterestedUser(
                            deleting.categoryId,
                            deleting.userId,
                        )
                    }
                    onDeleted={(updated) => {
                        setCategories(updated);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
