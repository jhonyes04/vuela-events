import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { ResourceLinkFormDialog } from '@/features/resources/components/ResourceLinkFormDialog';
import {
    deleteResourceLink,
    type ResourceLink,
} from '@/features/resources/lib/resourceLinks';
import { useResourceLinksStore } from '@/features/resources/store';

export const ResourceLinksTab = () => {
    const { user } = useAuth();
    const canManage = user?.permissions.includes('resources:create') ?? false;
    const links = useResourceLinksStore((s) => s.items);
    const loading = useResourceLinksStore((s) => s.loading);
    const error = useResourceLinksStore((s) => s.error);
    const load = useResourceLinksStore((s) => s.load);
    const upsert = useResourceLinksStore((s) => s.upsert);
    const remove = useResourceLinksStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<ResourceLink | null>(null);
    const [deleting, setDeleting] = useState<ResourceLink | null>(null);

    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (link: ResourceLink) => {
        setEditing(link);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    // Quien no gestiona recursos no ve ni los inactivos ni los botones.
    const visibleLinks = canManage ? links : links.filter((l) => l.active);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                {canManage && (
                    <Button onClick={openCreate}>Nuevo enlace</Button>
                )}
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando recursos…
                </p>
            ) : visibleLinks.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay enlaces.
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleLinks.map((link) => (
                        <li
                            key={link.id}
                            className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {link.title}
                                </p>
                                <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
                                >
                                    <ExternalLink className="size-3.5 shrink-0" />
                                    <span className="truncate">
                                        {link.url}
                                    </span>
                                </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                {!link.active && (
                                    <Badge variant="secondary">
                                        Inactivo
                                    </Badge>
                                )}
                                {canManage && (
                                    <>
                                        <IconTooltip label="Editar">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                aria-label="Editar"
                                                onClick={() => openEdit(link)}
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                        <IconTooltip label="Eliminar">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label="Eliminar"
                                                onClick={() =>
                                                    setDeleting(link)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <ResourceLinkFormDialog
                    key={formKey}
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    link={editing}
                    onSaved={upsert}
                />
            )}

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar enlace"
                    description={`¿Eliminar «${deleting.title}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el enlace"
                    successLabel={`Enlace «${deleting.title}» eliminado.`}
                    onConfirm={() => deleteResourceLink(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </div>
    );
};
