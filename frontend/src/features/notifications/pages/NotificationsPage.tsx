import { useEffect, useState } from 'react';
import { Bell, Check, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboboxField } from '@/components/ComboboxField';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { PageTitle } from '@/components/PageTitle';
import { PaginationControls } from '@/components/PaginationControls';
import { ListErrors } from '@/features/users/components/ListErrors';
import { NotificationDetailDialog } from '@/features/notifications/components/NotificationDetailDialog';
import { SendNotificationButton } from '@/features/notifications/components/SendNotificationButton';
import { useNotificationsStore } from '@/features/notifications/store';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useAsyncList } from '@/hooks/useAsyncList';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { formatDateTime } from '@/lib/dateFormat';
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
    confirmText: string;
}

type SortKey = 'createdAt' | 'title';
type StatusFilter = 'all' | 'unread' | 'read';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Todas' },
    { value: 'unread', label: 'Pendientes' },
    { value: 'read', label: 'Leídas' },
] as const;

export const NotificationsPage = () => {
    const {
        items: notifications,
        setItems: setNotifications,
        loading,
        error,
        load,
    } = useAsyncList(
        listNotifications,
        'No se pudieron cargar las notificaciones',
    );
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const {
        selected,
        setSelected,
        toggleOne,
        toggleAllPaged,
        removeFromSelection,
    } = useBulkSelection();
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [viewing, setViewing] = useState<AppNotification | null>(null);

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

    const changeTick = useNotificationsStore((s) => s.changeTick);
    const ensureStream = useNotificationsStore((s) => s.ensureStream);

    useEffect(() => {
        ensureStream();
    }, [ensureStream]);

    useEffect(() => {
        if (changeTick > 0) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changeTick]);

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

    const setReadLocally = (ids: Set<string>, readAt: string | null) => {
        setNotifications((prev) =>
            prev.map((n) => (ids.has(n.id) ? { ...n, readAt } : n)),
        );
    };

    // El cambio ya se aplicó en local (arriba); esto solo avisa si el
    // guardado en el servidor falla, no lo deshace.
    const notifyIfFailed = (promise: Promise<void>) => {
        promise.catch((e: unknown) => {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo guardar el cambio',
            );
        });
    };

    const handleToggleRead = (notification: AppNotification) => {
        const readAt = notification.readAt ? null : new Date().toISOString();

        setReadLocally(new Set([notification.id]), readAt);

        notifyIfFailed(
            readAt
                ? markNotificationRead(notification.id)
                : markNotificationUnread(notification.id),
        );
    };

    const handleMarkAllRead = () => {
        setReadLocally(
            new Set(notifications.map((n) => n.id)),
            new Date().toISOString(),
        );
        notifyIfFailed(markAllNotificationsRead());
    };

    const handleMarkAllUnread = () => {
        setReadLocally(new Set(notifications.map((n) => n.id)), null);
        notifyIfFailed(markAllNotificationsUnread());
    };

    const columns: DataTableColumn<AppNotification, SortKey>[] = [
        {
            key: 'select',
            header: (
                <Checkbox
                    aria-label="Seleccionar todas"
                    checked={allPagedSelected}
                    onCheckedChange={() =>
                        toggleAllPaged(
                            paged.map((n) => n.id),
                            allPagedSelected,
                        )
                    }
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
            render: (n) => formatDateTime(new Date(n.createdAt)),
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
                                    confirmText: n.title,
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
                <ComboboxField
                    className="w-full bg-card sm:w-40"
                    items={STATUS_OPTIONS}
                    getValue={(s) => s.value}
                    getLabel={(s) => s.label}
                    value={statusFilter}
                    onValueChange={(v) =>
                        setStatusFilter(v as StatusFilter)
                    }
                    searchable={false}
                    placeholder="Estado"
                />

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

                <div className="ms-auto flex items-center gap-2">
                    {selected.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                                setDeleting({
                                    ids: [...selected],
                                    label:
                                        selected.size === 1
                                            ? 'esta notificación'
                                            : `estas ${selected.size} notificaciones`,
                                    confirmText:
                                        'Eliminar notificaciones seleccionadas',
                                })
                            }
                        >
                            Eliminar seleccionadas ({selected.size})
                        </Button>
                    )}

                    <SendNotificationButton />
                </div>
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
                    confirmText={deleting.confirmText}
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
                        removeFromSelection(deleting.ids);
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
