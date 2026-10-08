import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PageTitle } from '@/components/PageTitle';
import { PaginationControls } from '@/components/PaginationControls';
import { SortableHeader } from '@/components/SortableHeader';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { DatePicker } from '@/features/datetime/components/DatePicker';
import { ApiError } from '@/lib/api';
import {
    actionLabel,
    auditPersonLabel,
    deleteAuditLogs,
    listAuditLogs,
    type AuditLogEntry,
} from '@/features/audit/lib/audit';

interface Pending {
    ids: string[];
    label: string;
}

const selectClass =
    'h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

type SortKey = 'createdAt' | 'action' | 'actor' | 'target';

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

// Mismo formato 'YYYY-MM-DD' que usa DatePicker, en hora de Madrid.
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
});

export const AuditPage = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState<Pending | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setLogs(await listAuditLogs());
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

    // Solo las acciones que aparecen realmente en lo cargado.
    const actions = [...new Set(logs.map((l) => l.action))].sort((a, b) =>
        actionLabel(a).localeCompare(actionLabel(b)),
    );

    const filtered = logs.filter((log) => {
        if (actionFilter && log.action !== actionFilter) return false;

        const dayKey = dayKeyFormat.format(new Date(log.createdAt));

        if (from && dayKey < from) return false;
        if (to && dayKey > to) return false;

        if (search) {
            const q = search.trim().toLowerCase();
            const haystack = [
                auditPersonLabel(log.actor),
                log.actor?.email,
                auditPersonLabel(log.target),
                log.target?.email,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (!haystack.includes(q)) return false;
        }

        return true;
    });

    const { sorted, sort, toggleSort } = useSort<AuditLogEntry, SortKey>(
        filtered,
        {
            createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
            action: (a, b) =>
                actionLabel(a.action).localeCompare(actionLabel(b.action)),
            actor: (a, b) =>
                auditPersonLabel(a.actor).localeCompare(
                    auditPersonLabel(b.actor),
                ),
            target: (a, b) =>
                auditPersonLabel(a.target).localeCompare(
                    auditPersonLabel(b.target),
                ),
        },
        { key: 'createdAt', dir: 'desc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 25);

    const allPagedSelected =
        paged.length > 0 && paged.every((log) => selected.has(log.id));

    const toggleAllPaged = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                paged.forEach((log) => next.delete(log.id));
            } else {
                paged.forEach((log) => next.add(log.id));
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

    return (
        <section>
            <PageTitle>Auditoría</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Buscar por nombre o correo…"
                    className="bg-card w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className={selectClass}
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                >
                    <option value="">Todas las acciones</option>
                    {actions.map((a) => (
                        <option key={a} value={a}>
                            {actionLabel(a)}
                        </option>
                    ))}
                </select>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Desde
                    <DatePicker value={from} onChange={setFrom} />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Hasta
                    <DatePicker value={to} onChange={setTo} />
                </div>
                {selected.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                            setDeleting({
                                ids: [...selected],
                                label:
                                    selected.size === 1
                                        ? 'este registro'
                                        : `estos ${selected.size} registros`,
                            })
                        }
                    >
                        Eliminar seleccionados ({selected.size})
                    </Button>
                )}
            </div>

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando auditoría…
                </p>
            ) : (
                <OverlayScrollbarsComponent
                    className="rounded-xl border bg-card"
                    options={scrollbarOptions}
                    defer
                >
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 text-left">
                                <th className="w-10 p-3">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-primary"
                                        aria-label="Seleccionar todos"
                                        checked={allPagedSelected}
                                        onChange={toggleAllPaged}
                                    />
                                </th>
                                <SortableHeader
                                    label="Fecha"
                                    sortKey="createdAt"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Acción"
                                    sortKey="action"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Quién"
                                    sortKey="actor"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Sobre quién"
                                    sortKey="target"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <th className="p-3 font-bold">Detalle</th>
                                <th className="p-3 font-bold">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((log) => (
                                <tr
                                    key={log.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            className="size-4 accent-primary"
                                            aria-label="Seleccionar"
                                            checked={selected.has(log.id)}
                                            onChange={() => toggleOne(log.id)}
                                        />
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {dateTimeFormat.format(
                                            new Date(log.createdAt),
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {actionLabel(log.action)}
                                    </td>
                                    <td className="p-3">
                                        {auditPersonLabel(log.actor)}
                                    </td>
                                    <td className="p-3">
                                        {log.target
                                            ? auditPersonLabel(log.target)
                                            : '—'}
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {log.oldValue || log.newValue
                                            ? `${log.oldValue ?? ''} → ${log.newValue ?? ''}`
                                            : '—'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <IconTooltip label="Eliminar">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label="Eliminar"
                                                onClick={() =>
                                                    setDeleting({
                                                        ids: [log.id],
                                                        label: 'este registro',
                                                    })
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </OverlayScrollbarsComponent>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay registros que coincidan con los filtros.
                </p>
            )}

            {!loading && (
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

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar auditoría"
                    description={`¿Eliminar ${deleting.label}? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar"
                    successLabel={
                        deleting.ids.length === 1
                            ? 'Registro eliminado.'
                            : `${deleting.ids.length} registros eliminados.`
                    }
                    onConfirm={() => deleteAuditLogs(deleting.ids)}
                    onDeleted={() => {
                        const removed = new Set(deleting.ids);

                        setLogs((prev) =>
                            prev.filter((l) => !removed.has(l.id)),
                        );
                        setSelected((prev) => {
                            const next = new Set(prev);

                            removed.forEach((id) => next.delete(id));

                            return next;
                        });
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
