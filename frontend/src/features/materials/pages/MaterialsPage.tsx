import { useEffect, useState } from 'react';
import { Package, Pencil, Trash2 } from 'lucide-react';
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
import { MaterialFormDialog } from '@/features/materials/components/MaterialFormDialog';
import { deleteMaterial, type Material } from '@/features/materials/lib/materials';
import { useMaterialsStore } from '@/features/materials/store';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';

type SortKey = 'name' | 'active';

export const MaterialsPage = () => {
    const { user } = useAuth();
    const materials = useMaterialsStore((s) => s.items);
    const loading = useMaterialsStore((s) => s.loading);
    const error = useMaterialsStore((s) => s.error);
    const load = useMaterialsStore((s) => s.load);
    const upsert = useMaterialsStore((s) => s.upsert);
    const remove = useMaterialsStore((s) => s.remove);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Material | null>(null);
    const [deleting, setDeleting] = useState<Material | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (material: Material) => {
        setEditing(material);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const query = search.trim().toLowerCase();
    const filtered = query
        ? materials.filter((m) => m.name.toLowerCase().includes(query))
        : materials;

    const { sorted, sort, toggleSort } = useSort<Material, SortKey>(
        filtered,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'name', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const columns: DataTableColumn<Material, SortKey>[] = [
        {
            key: 'name',
            header: 'Nombre',
            sortKey: 'name',
            render: (material) => material.name,
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (material) =>
                material.active ? (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        Activo
                    </Badge>
                ) : (
                    <Badge
                        variant="outline"
                        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    >
                        Inactivo
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (material) => (
                <>
                    {canManageResource(
                        user,
                        material.createdById,
                        'materials:edit',
                        'materials:edit:own',
                    ) && (
                        <IconTooltip label="Editar">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(material)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                    {canManageResource(
                        user,
                        material.createdById,
                        'materials:delete',
                        'materials:delete:own',
                    ) && (
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                onClick={() => setDeleting(material)}
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
                <PageTitle icon={Package} className="mb-0">
                    Gestionar Materiales
                </PageTitle>
                <Button onClick={openCreate}>Nuevo material</Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Buscar por nombre…"
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
                    Cargando materiales…
                </p>
            ) : (
                <div className="rounded-xl border bg-card">
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(material) => material.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </div>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    {query
                        ? 'No hay materiales que coincidan con la búsqueda.'
                        : 'Todavía no hay materiales.'}
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

            <MaterialFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                material={editing}
                onSaved={upsert}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar material"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el material"
                    successLabel={`Material «${deleting.name}» eliminado.`}
                    onConfirm={() => deleteMaterial(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
