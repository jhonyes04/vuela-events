import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { GuideFormDialog } from '@/features/guides/components/GuideFormDialog';
import { deleteGuide, type Guide } from '@/features/guides/lib/guides';
import { useGuidesStore } from '@/features/guides/store';
import { PageTitle } from '@/components/PageTitle';

export const GuidesPage = () => {
    const guides = useGuidesStore((s) => s.items);
    const loading = useGuidesStore((s) => s.loading);
    const error = useGuidesStore((s) => s.error);
    const load = useGuidesStore((s) => s.load);
    const upsert = useGuidesStore((s) => s.upsert);
    const remove = useGuidesStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Guide | null>(null);
    const [deleting, setDeleting] = useState<Guide | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (guide: Guide) => {
        setEditing(guide);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle>Gestionar Guías</PageTitle>
                <Button onClick={openCreate}>Nueva guía</Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
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
                            <IconTooltip label="Editar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Editar"
                                    onClick={() => openEdit(guide)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </IconTooltip>
                            <IconTooltip label="Eliminar">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    onClick={() => setDeleting(guide)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        </li>
                    ))}
                </ul>
            )}

            <GuideFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                guide={editing}
                onSaved={upsert}
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
                    successLabel={`Guía «${deleting.name}» eliminada.`}
                    onConfirm={() => deleteGuide(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
