import { useEffect, useState } from 'react';
import { FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { PageTitle } from '@/components/PageTitle';
import { PaginationControls } from '@/components/PaginationControls';
import { ListErrors } from '@/features/users/components/ListErrors';
import { ProjectFormDialog } from '@/features/projects/components/ProjectFormDialog';
import { deleteProject, type Project } from '@/features/projects/lib/projects';
import { getProjectColorSwatch } from '@/features/projects/lib/colors';
import { cn } from '@/lib/utils';
import { useProjectsStore } from '@/features/projects/store';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';
import { stripHtml } from '@/lib/html';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';

const CHARACTERS_LENGTH = 130;

export const ProjectsPage = () => {
    const { user } = useAuth();
    const projects = useProjectsStore((s) => s.items);
    const loading = useProjectsStore((s) => s.loading);
    const error = useProjectsStore((s) => s.error);
    const load = useProjectsStore((s) => s.load);
    const upsert = useProjectsStore((s) => s.upsert);
    const remove = useProjectsStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const [search, setSearch] = useState('');

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (project: Project) => {
        setEditing(project);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const filtered = projects.filter((p) => {
        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            p.name.toLowerCase().includes(q) ||
            p.guides.some((g) => g.name.toLowerCase().includes(q))
        );
    });

    const { sorted, sort, toggleSort } = useSort<Project, 'name' | 'active'>(
        filtered,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'name', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const columns: DataTableColumn<Project, 'name' | 'active'>[] = [
        {
            key: 'name',
            header: 'Nombre',
            sortKey: 'name',
            render: (p) => {
                const swatch = getProjectColorSwatch(p.color);

                return (
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className={cn(
                                'size-4 shrink-0 rounded-full',
                                swatch.className,
                            )}
                            style={swatch.style}
                        />
                        <span className="truncate font-medium">{p.name}</span>
                    </div>
                );
            },
        },
        {
            key: 'guides',
            header: 'Guías',
            headerClassName: 'hidden sm:table-cell',
            cellClassName: 'hidden sm:table-cell max-w-xs truncate',
            render: (p) => {
                const text =
                    p.guides.map((guide) => guide.name).join(', ') || '-';

                return (
                    text.slice(0, CHARACTERS_LENGTH) +
                    (text.length > CHARACTERS_LENGTH ? '…' : '')
                );
            },
        },
        {
            key: 'openingInstructions',
            header: 'Observaciones',
            headerClassName: 'hidden sm:table-cell',
            cellClassName: 'hidden sm:table-cell max-w-xs truncate',
            render: (p) => {
                if (!p.openingInstructions) return '—';

                const text = stripHtml(p.openingInstructions);
                const match = text.match(/observaciones\s*:?/i);
                const relevant = match
                    ? text.slice(match.index! + match[0].length).trim()
                    : text;

                return relevant
                    ? relevant.slice(0, CHARACTERS_LENGTH) +
                          (relevant.length > CHARACTERS_LENGTH ? '…' : '')
                    : '—';
            },
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (p) =>
                p.active ? (
                    <Badge
                        variant="default"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        Activo
                    </Badge>
                ) : (
                    <Badge
                        variant="default"
                        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    >
                        Desactivado
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (p) => (
                <>
                    {canManageResource(
                        user,
                        p.createdById,
                        'projects:edit',
                        'projects:edit:own',
                    ) && (
                        <IconTooltip label="Editar">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(p)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                    {canManageResource(
                        user,
                        p.createdById,
                        'projects:delete',
                        'projects:delete:own',
                    ) && (
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                onClick={() => setDeleting(p)}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={FolderKanban}>Gestionar Proyectos</PageTitle>
                <Button onClick={openCreate} className="mb-4 sm:mb-0 ms-auto">
                    Nuevo proyecto
                </Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            <div className="mb-4">
                <Input
                    placeholder="Buscar por nombre o guía…"
                    className="bg-card w-full sm:w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando proyectos…
                </p>
            ) : (
                <OverlayScrollbarsComponent
                    className="rounded-xl border bg-card"
                    options={scrollbarOptions}
                    defer
                >
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(p) => p.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </OverlayScrollbarsComponent>
            )}

            {!loading && sorted.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay proyectos que coincidan con la búsqueda.
                </p>
            )}

            {!loading && sorted.length > 0 && (
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

            <ProjectFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                project={editing}
                onSaved={upsert}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar proyecto"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el proyecto"
                    successLabel={`Proyecto «${deleting.name}» eliminado.`}
                    onConfirm={() => deleteProject(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
