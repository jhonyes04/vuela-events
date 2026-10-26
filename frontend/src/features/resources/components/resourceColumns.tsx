import {
    CircleCheck,
    CircleX,
    Eye,
    FileText,
    Link2,
    Pencil,
    Trash2,
} from 'lucide-react';
import type { User } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconTooltip } from '@/components/IconTooltip';
import { type DataTableColumn } from '@/components/DataTable';
import { canManageResource } from '@/lib/ownership';
import type {
    Pending,
    ResourceRow,
    SortKey,
} from '@/features/resources/pages/resourcesTable.types';

interface BuildResourceColumnsParams {
    user: Pick<User, 'id' | 'permissions'> | null;
    selected: Set<string>;
    allPagedSelected: boolean;
    toggleAllPaged: () => void;
    toggleOne: (key: string) => void;
    rowKey: (row: ResourceRow) => string;
    canDeleteRow: (row: ResourceRow) => boolean;
    openEdit: (row: ResourceRow) => void;
    view: (row: ResourceRow) => void;
    setDeleting: (pending: Pending) => void;
}

export const buildResourceColumns = ({
    user,
    selected,
    allPagedSelected,
    toggleAllPaged,
    toggleOne,
    rowKey,
    canDeleteRow,
    openEdit,
    view,
    setDeleting,
}: BuildResourceColumnsParams): DataTableColumn<ResourceRow, SortKey>[] => [
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
        render: (row) =>
            canDeleteRow(row) &&
            !row.inUse && (
                <Checkbox
                    aria-label="Seleccionar"
                    checked={selected.has(rowKey(row))}
                    onCheckedChange={() => toggleOne(rowKey(row))}
                />
            ),
    },
    {
        key: 'kind',
        header: 'Tipo',
        sortKey: 'kind',
        cellClassName: 'whitespace-nowrap',
        render: (row) => (
            <Badge
                variant="outline"
                className={`${row.kind === 'document' ? 'bg-blue-300' : 'bg-green-300'} gap-1`}
            >
                {row.kind === 'document' ? (
                    <FileText className="size-3.5" />
                ) : (
                    <Link2 className="size-3.5" />
                )}
                {row.kind === 'document' ? 'Documento' : 'Enlace'}
            </Badge>
        ),
    },
    {
        key: 'title',
        header: 'Título',
        sortKey: 'title',
        render: (row) => (
            <div className="min-w-0">
                <p className="truncate font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {row.detail}
                </p>
            </div>
        ),
    },
    {
        key: 'inUse',
        header: 'En uso',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (row) =>
            row.inUse ? (
                <IconTooltip label="En uso en algún proyecto">
                    <CircleCheck className="size-4 mx-auto text-emerald-600" />
                </IconTooltip>
            ) : (
                <IconTooltip label="No usado">
                    <CircleX className="size-4 mx-auto text-destructive" />
                </IconTooltip>
            ),
    },
    {
        key: 'status',
        header: 'Estado',
        render: (row) =>
            row.active ? (
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
        render: (row) => {
            const canEditRow = canManageResource(
                user,
                row.createdById,
                'resources:edit',
                'resources:edit:own',
            );
            return (
                <>
                    <IconTooltip label="Ver">
                        <Button
                            variant="default"
                            size="icon"
                            aria-label="Ver"
                            onClick={() => view(row)}
                        >
                            <Eye className="size-4" />
                        </Button>
                    </IconTooltip>
                    {canEditRow && (
                        <IconTooltip label="Editar">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(row)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                    {canDeleteRow(row) && (
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                disabled={row.inUse}
                                onClick={() =>
                                    setDeleting({
                                        rows: [row],
                                        label: `«${row.title}»`,
                                    })
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                </>
            );
        },
    },
];
