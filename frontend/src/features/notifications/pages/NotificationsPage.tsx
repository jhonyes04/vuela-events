import { useEffect, useState } from 'react';
import { Bell, Check, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { PageTitle } from '@/components/PageTitle';
import { PaginationControls } from '@/components/PaginationControls';
import { ListErrors } from '@/features/users/components/ListErrors';
import { NotificationDetailDialog } from '@/features/notifications/components/NotificationDetailDialog';
import { useNotificationStream } from '@/features/notifications/hooks/useNotificationStream';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { ApiError } from '@/lib/api';
import {
    type AppNotification,
    deleteNotifications,
    listNotifications,
    markAllNotificationsRead,
    markAllNotificationsUnread,
    markNotificationRead,
    markNotificationUnread,
} from '@/features/notifications/lib/notifications';

interface Pending {
    ids: string[];
    label: string;
    confirText: string;
}

const selectClass =
    'h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

type SortKey = 'createdAt' | 'title';
type StatusFilter = 'all' | 'unread' | 'read';

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [viewing, setViewing] = useState<AppNotification | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setNotifications(await listNotifications());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudieron cargar las notificaciones',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    // Avisa de cambios hechos en la campanita (u otra pestaña): sin esto,
    // marcar/borrar aquí o allí no se enteraba la otra vista.
    const refresh = () => {
        void listNotifications()
            .then((list) => {
                setNotifications(list);
                setSelected((prev) => {
                    const ids = new Set(list.map((n) => n.id));

                    return new Set([...prev].filter((id) => ids.has(id)));
                });
            })
            .catch(() => {});
    };

    useNotificationStream(refresh);

    const unreadCount = notifications.filter((n) => !n.readAt).length;
    const readCount = notifications.length - unreadCount;

    const filtered = notifications.filter((n) => {
        if (statusFilter === 'unread') return !n.readAt;
        if (statusFilter === 'read') return !!n.readAt;
        return true;
    });

    const { sorted, sort, toggleSort } = useSort<AppNotification, SortKey>(
        filtered,
        {
            createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
            title: (a, b) => a.title.localeCompare(b.title),
        },
        { key: 'createdAt', dir: 'desc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 25);

    const allPagedSelected =
        paged.length > 0 && paged.every((n) => selected.has(n.id));

    const toggleAllPaged = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                paged.forEach((n) => next.delete(n.id));
            } else {
                paged.forEach((n) => next.add(n.id));
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

    const setReadLocally = (ids: Set<string>, readAt: string | null) => {
        setNotifications((prev) =>
            prev.map((n) => (ids.has(n.id) ? { ...n, readAt } : n)),
        );
    };

    const handleToggleRead = (notification: AppNotification) => {
        const readAt = notification.readAt ? null : new Date().toISOString();

        setReadLocally(new Set([notification.id]), readAt);

        void (readAt
            ? markNotificationRead(notification.id)
            : markNotificationUnread(notification.id));
    };

    const handleMarkAllRead = () => {
        setReadLocally(
            new Set(notifications.map((n) => n.id)),
            new Date().toISOString(),
        );
        void markAllNotificationsRead();
    };

    const handleMarkAllUnread = () => {
        setReadLocally(new Set(notifications.map((n) => n.id)), null);
        void markAllNotificationsUnread();
    };

    const columns: DataTableColumn<AppNotification, SortKey>[] = [
        {
            key: 'select',
            header: (
                <Checkbox
                    aria-label="Seleccionar todas"
                    checked={allPagedSelected}
                    onCheckedChange={toggleAllPaged}
                />
            ),
            headerClassName: 'w-10 font-normal',
            render: (n) => (
                <Checkbox
                    aria-label="Seleccionar"
                    checked={selected.has(n.id)}
                    onCheckedChange={() => toggleOne(n.id)}
                />
            ),
        },
        {
            key: 'status',
            header: 'Estado',
            render: (n) => (
                <Badge variant={n.readAt ? 'secondary' : 'default'}>
                    {n.readAt ? 'Leída' : 'Pendiente'}
                </Badge>
            ),
        },
        {
            key: 'title',
            header: 'Título',
            sortKey: 'title',
            render: (n) => n.title,
        },
        {
            key: 'createdAt',
            header: 'Fecha',
            sortKey: 'createdAt',
            cellClassName: 'whitespace-nowrap',
            render: (n) => dateTimeFormat.format(new Date(n.createdAt)),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            render: (n) => (
                <div className="flex justify-end gap-1">
                    <IconTooltip label="Ver">
                        <Button
                            variant="default"
                            size="icon"
                            aria-label="Ver"
                            onClick={() => setViewing(n)}
                        >
                            <Eye className="size-4" />
                        </Button>
                    </IconTooltip>
                    <IconTooltip
                        label={n.readAt ? 'Marcar no leída' : 'Marcar leída'}
                    >
                        <Button
                            variant="secondary"
                            size="icon"
                            aria-label={
                                n.readAt ? 'Marcar no leída' : 'Marcar leída'
                            }
                            onClick={() => handleToggleRead(n)}
                        >
                            {n.readAt ? (
                                <RotateCcw className="size-4" />
                            ) : (
                                <Check className="size-4" />
                            )}
                        </Button>
                    </IconTooltip>
                    <IconTooltip label="Eliminar">
                        <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Eliminar"
                            onClick={() =>
                                setDeleting({
                                    ids: [n.id],
                                    label: 'esta notificación',
                                    confirText: n.title,
                                })
                            }
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </IconTooltip>
                </div>
            ),
        },
    ];

    return (
        <section>
            <PageTitle icon={Bell}>Notificaciones</PageTitle>

            <p className="mb-4 text-sm text-muted-foreground">
                Las notificaciones se eliminan automáticamente a los 30 días.
            </p>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <select
                    className={selectClass}
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value as StatusFilter)
                    }
                >
                    <option value="all">Todas</option>
                    <option value="unread">Pendientes</option>
                    <option value="read">Leídas</option>
                </select>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                    >
                        Marcar todas como leídas
                    </Button>
                )}

                {readCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllUnread}
                    >
                        Marcar todas como no leídas
                    </Button>
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
                                        ? 'esta notificación'
                                        : `estas ${selected.size} notificaciones`,
                                confirText:
                                    'Eliminar notificaciones seleccionadas',
                            })
                        }
                    >
                        Eliminar seleccionadas ({selected.size})
                    </Button>
                )}
            </div>

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando notificaciones…
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
                        rowKey={(n) => n.id}
                        sort={sort}
                        onSort={toggleSort}
                        rowClassName={(n) =>
                            !n.readAt ? 'bg-brand-yellow/10' : ''
                        }
                    />
                </OverlayScrollbarsComponent>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay notificaciones que coincidan con el filtro.
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
                    title="Eliminar notificaciones"
                    description={`¿Eliminar ${deleting.label}?`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar"
                    confirmText={deleting.confirText}
                    successLabel={
                        deleting.ids.length === 1
                            ? 'Notificación eliminada.'
                            : `${deleting.ids.length} notificaciones eliminadas.`
                    }
                    onConfirm={() => deleteNotifications(deleting.ids)}
                    onDeleted={() => {
                        const removed = new Set(deleting.ids);

                        setNotifications((prev) =>
                            prev.filter((n) => !removed.has(n.id)),
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

            <NotificationDetailDialog
                notification={viewing}
                onClose={() => setViewing(null)}
            />
        </section>
    );
};
