import { useEffect, useState } from 'react';
import {
    BookOpen,
    CircleCheck,
    CircleX,
    ExternalLink,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { ListErrors } from '@/features/users/components/ListErrors';
import { GuideFormDialog } from '@/features/guides/components/GuideFormDialog';
import { deleteGuide, type Guide } from '@/features/guides/lib/guides';
import { useGuidesStore } from '@/features/guides/store';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';

type SortKey = 'name' | 'url' | 'active';

interface Pending {
    ids: string[];
    label: string;
}

export const GuidesPage = () => {
    const { user } = useAuth();
    const guides = useGuidesStore((s) => s.items);
    const loading = useGuidesStore((s) => s.loading);
    const error = useGuidesStore((s) => s.error);
    const load = useGuidesStore((s) => s.load);
    const upsert = useGuidesStore((s) => s.upsert);
    const remove = useGuidesStore((s) => s.remove);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Guide | null>(null);
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());

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

    const query = search.trim().toLowerCase();
    const filtered = query
        ? guides.filter(
              (g) =>
                  g.name.toLowerCase().includes(query) ||
                  g.url.toLowerCase().includes(query),
          )
        : guides;

    const { sorted, sort, toggleSort } = useSort<Guide, SortKey>(
        filtered,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            url: (a, b) => a.url.localeCompare(b.url),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'name', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const canDeleteGuide = (guide: Guide) =>
        canManageResource(
            user,
            guide.createdById,
            'guides:delete',
            'guides:delete:own',
        );

    const deletablePaged = paged.filter(
        (guide) => canDeleteGuide(guide) && !guide.inUse,
    );
    const allPagedSelected =
        deletablePaged.length > 0 &&
        deletablePaged.every((guide) => selected.has(guide.id));

    const toggleAllPaged = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                deletablePaged.forEach((guide) => next.delete(guide.id));
            } else {
                deletablePaged.forEach((guide) => next.add(guide.id));
            }

            return next;
        });
    };

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const columns: DataTableColumn<Guide, SortKey>[] = [
        {
            key: 'select',
            header: (
                <Checkbox
                    aria-label="Seleccionar todos"
                    checked={allPagedSelected}
                    onCheckedChange={toggleAllPaged}
                />
            ),
            headerClassName: 'w-10 font-normal',
            render: (guide) =>
                canDeleteGuide(guide) &&
                !guide.inUse && (
                    <Checkbox
                        aria-label="Seleccionar"
                        checked={selected.has(guide.id)}
                        onCheckedChange={() => toggleOne(guide.id)}
                    />
                ),
        },
        {
            key: 'name',
            header: 'Nombre',
            sortKey: 'name',
            render: (guide) => guide.name,
        },
        {
            key: 'url',
            header: 'URL',
            sortKey: 'url',
            headerClassName: 'hidden sm:table-cell',
            cellClassName: 'hidden sm:table-cell',
            render: (guide) => (
                <a
                    href={guide.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:underline"
                >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{guide.url}</span>
                </a>
            ),
        },
        {
            key: 'inUse',
            header: 'En uso',
            cellClassName: 'flex justify-center',
            render: (guide) =>
                guide.inUse ? (
                    <IconTooltip label="En uso en algún proyecto">
                        <CircleCheck className="size-4 text-emerald-600" />
                    </IconTooltip>
                ) : (
                    <IconTooltip label="No usado">
                        <CircleX className="size-4 text-destructive" />
                    </IconTooltip>
                ),
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (guide) =>
                guide.active ? (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        Activa
                    </Badge>
                ) : (
                    <Badge
                        variant="outline"
                        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    >
                        Inactiva
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (guide) => (
                <>
                    {canManageResource(
                        user,
                        guide.createdById,
                        'guides:edit',
                        'guides:edit:own',
                    ) && (
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
                    )}
                    {canManageResource(
                        user,
                        guide.createdById,
                        'guides:delete',
                        'guides:delete:own',
                    ) && (
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                disabled={guide.inUse}
                                onClick={() =>
                                    setDeleting({
                                        ids: [guide.id],
                                        label: `«${guide.name}»`,
                                    })
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                </>
            ),
        },
    ];

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={BookOpen} className="mb-0">
                    Gestionar Guías
                </PageTitle>
                <Button onClick={openCreate}>Nueva guía</Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Buscar por nombre o URL…"
                    className="w-full sm:w-64 bg-card"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {selected.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="ms-auto"
                        onClick={() =>
                            setDeleting({
                                ids: [...selected],
                                label:
                                    selected.size === 1
                                        ? 'esta guía'
                                        : `estas ${selected.size} guías`,
                            })
                        }
                    >
                        Eliminar seleccionadas ({selected.size})
                    </Button>
                )}
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
            ) : (
                <div className="rounded-xl border bg-card">
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(guide) => guide.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </div>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    {query
                        ? 'No hay guías que coincidan con la búsqueda.'
                        : 'Todavía no hay guías.'}
                </p>
            )}

            {!loading && total > 0 && (
                <div className="mt-4">
                    <PaginationControls
                        page={page}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
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
                    description={`¿Eliminar ${deleting.label}?`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar la guía"
                    successLabel={({ succeeded, failed }) =>
                        failed === 0
                            ? succeeded.length === 1
                                ? 'Guía eliminada.'
                                : `${succeeded.length} guías eliminadas.`
                            : `${succeeded.length} eliminada${succeeded.length === 1 ? '' : 's'}, ${failed} en uso (no se pudo eliminar).`
                    }
                    onConfirm={async () => {
                        const results = await Promise.allSettled(
                            deleting.ids.map((id) =>
                                deleteGuide(id).then(() => id),
                            ),
                        );
                        const succeeded = results
                            .filter(
                                (r): r is PromiseFulfilledResult<string> =>
                                    r.status === 'fulfilled',
                            )
                            .map((r) => r.value);
                        const failed = deleting.ids.length - succeeded.length;

                        if (succeeded.length === 0) {
                            throw new Error('No se pudo eliminar');
                        }

                        return { succeeded, failed };
                    }}
                    onDeleted={({ succeeded }) => {
                        succeeded.forEach(remove);
                        setSelected((prev) => {
                            const next = new Set(prev);

                            succeeded.forEach((id) => next.delete(id));

                            return next;
                        });
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
