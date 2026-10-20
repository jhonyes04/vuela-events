import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

    const columns: DataTableColumn<Guide, SortKey>[] = [
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
                                onClick={() => setDeleting(guide)}
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

            <div className="mb-4">
                <Input
                    placeholder="Buscar por nombre o URL…"
                    className="w-full sm:w-64 bg-card"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
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
