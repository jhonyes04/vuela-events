import { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Package, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { OwnerFilterField } from '@/components/OwnerFilterField';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { useOwnerFilter } from '@/hooks/useOwnerFilter';
import { ListErrors } from '@/features/users/components/ListErrors';
import { MaterialFormDialog } from '@/features/materials/components/MaterialFormDialog';
import { OwnerCell } from '@/components/OwnerCell';
import {
    deleteMaterial,
    type Material,
} from '@/features/materials/lib/materials';
import { useMaterialsStore } from '@/features/materials/store';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';

type SortKey = 'name' | 'active';

interface Pending {
    ids: string[];
    label: string;
}

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
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const canSeeOwner = user?.roleId === 'admin' || user?.roleId === 'dt';

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

    const { ownerFilter, setOwnerFilter, ownerOptions, matchesOwner } =
        useOwnerFilter(materials);

    const query = search.trim().toLowerCase();
    const filtered = materials.filter((material) => {
        if (query && !material.name.toLowerCase().includes(query)) return false;

        return matchesOwner(material);
    });

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

    const canDeleteMaterial = (material: Material) =>
        canManageResource(
            user,
            material.createdById,
            'materials:delete',
            'materials:delete:own',
        );

    const deletablePaged = paged.filter(
        (material) => canDeleteMaterial(material) && !material.inUse,
    );
    const allPagedSelected =
        deletablePaged.length > 0 &&
        deletablePaged.every((material) => selected.has(material.id));

    const toggleAllPaged = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                deletablePaged.forEach((material) => next.delete(material.id));
            } else {
                deletablePaged.forEach((material) => next.add(material.id));
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

    const columns: DataTableColumn<Material, SortKey>[] = [
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
            render: (material) =>
                canDeleteMaterial(material) &&
                !material.inUse && (
                    <Checkbox
                        aria-label="Seleccionar"
                        checked={selected.has(material.id)}
                        onCheckedChange={() => toggleOne(material.id)}
                    />
                ),
        },
        {
            key: 'name',
            header: 'Nombre',
            sortKey: 'name',
            render: (material) => material.name,
        },
        {
            key: 'observations',
            header: 'Observaciones',
            headerClassName: 'hidden sm:table-cell',
            cellClassName: 'hidden sm:table-cell',
            render: (material) => material.observations ?? '—',
        },
        ...(canSeeOwner
            ? [
                  {
                      key: 'owner',
                      header: 'Propietario',
                      render: (material) => (
                          <OwnerCell owner={material.createdBy} />
                      ),
                  } satisfies DataTableColumn<Material, SortKey>,
              ]
            : []),
        {
            key: 'inUse',
            header: 'En uso',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (material) =>
                material.inUse ? (
                    <IconTooltip label="En uso en algún evento">
                        <CircleCheck className="size-4 mx-auto text-emerald-600" />
                    </IconTooltip>
                ) : (
                    <IconTooltip label="No usado">
                        <CircleX className="size-4 mx-auto text-destructive" />
                    </IconTooltip>
                ),
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
                        <IconTooltip
                            label={
                                material.inUse
                                    ? 'En uso en algún evento'
                                    : 'Eliminar'
                            }
                        >
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                disabled={material.inUse}
                                onClick={() =>
                                    setDeleting({
                                        ids: [material.id],
                                        label: `«${material.name}»`,
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
                <PageTitle icon={Package} className="mb-0">
                    Gestionar Materiales
                </PageTitle>
                <Button onClick={openCreate} className="ms-auto">
                    Nuevo material
                </Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Buscar por nombre…"
                    className="w-full sm:w-64 bg-card"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {canSeeOwner && (
                    <OwnerFilterField
                        options={ownerOptions}
                        value={ownerFilter}
                        onValueChange={setOwnerFilter}
                    />
                )}
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
                                        ? 'este material'
                                        : `estos ${selected.size} materiales`,
                            })
                        }
                    >
                        Eliminar seleccionados ({selected.size})
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
                    {query || ownerFilter
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
                    description={`¿Eliminar ${deleting.label}?`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el material"
                    successLabel={({ succeeded, failed }) =>
                        failed === 0
                            ? succeeded.length === 1
                                ? 'Material eliminado.'
                                : `${succeeded.length} materiales eliminados.`
                            : `${succeeded.length} eliminado${succeeded.length === 1 ? '' : 's'}, ${failed} en uso (no se pudo eliminar).`
                    }
                    onConfirm={async () => {
                        const results = await Promise.allSettled(
                            deleting.ids.map((id) =>
                                deleteMaterial(id).then(() => id),
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
