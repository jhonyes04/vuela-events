import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/features/events/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { GuideFormDialog } from '@/features/guides/components/GuideFormDialog';
import {
    deleteGuide,
    listGuides,
    type Guide,
} from '@/features/guides/lib/guides';
import { ApiError } from '@/lib/api';

export const GuidesPage = () => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Guide | null>(null);
    const [deleting, setDeleting] = useState<Guide | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setGuides(await listGuides());
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

    const openEdit = (guide: Guide) => {
        setEditing(guide);
        setFormOpen(true);
    };

    const handleSaved = (guide: Guide) => {
        setGuides((prev) => {
            const exists = prev.some((g) => g.id === guide.id);

            return (
                exists
                    ? prev.map((g) => (g.id === guide.id ? guide : g))
                    : [...prev, guide]
            ).sort((a, b) => a.name.localeCompare(b.name));
        });
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Guías</h1>
                <Button onClick={openCreate}>Nueva guía</Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando guías…
                </p>
            ) : guides.length === 0 ? (
                <p className="text-muted-foreground">Todavía no hay guías.</p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {guides.map((guide) => (
                        <li
                            key={guide.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {guide.name}
                                </p>
                                <a
                                    href={guide.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
                                >
                                    <ExternalLink className="size-3.5 shrink-0" />
                                    <span className="truncate">
                                        {guide.url}
                                    </span>
                                </a>
                            </div>
                            {!guide.active && (
                                <Badge variant="secondary">Inactiva</Badge>
                            )}
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(guide)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                onClick={() => setDeleting(guide)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <GuideFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                guide={editing}
                onSaved={handleSaved}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar guía"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar la guía"
                    onConfirm={() => deleteGuide(deleting.id)}
                    onDeleted={() => {
                        setGuides((prev) =>
                            prev.filter((g) => g.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
