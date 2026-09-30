import { useEffect, useState } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconTooltip } from '@/components/IconTooltip';
import { AttendeesDialog } from '@/features/events/components/AttendeesDialog';
import { EventEditDialog } from '@/features/events/components/CreateEventDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PaginationControls } from '@/components/PaginationControls';
import { SortableHeader } from '@/components/SortableHeader';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    attendanceLabel,
    dayKey,
    deleteEventById,
    formatMonthLabel,
    formatShortDate,
    formatTime,
    hasEnded,
    listAllEvents,
    type EventItem,
} from '@/features/events/lib/events';

const selectClass =
    'h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

type SortKey = 'title' | 'category' | 'startsAt' | 'location' | 'capacity';

type TimeFilter = 'all' | 'past' | 'future';

// 'YYYY-MM' -> 'Septiembre de 2026'
const monthLabelFrom = (key: string): string => {
    const [year, month] = key.split('-').map(Number);

    return formatMonthLabel(year!, month! - 1);
};

export const EventsManagementPage = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('future');
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<EventItem | null>(null);
    const [deleting, setDeleting] = useState<EventItem | null>(null);
    const [attendeesOpen, setAttendeesOpen] = useState(false);
    const [viewingAttendees, setViewingAttendees] = useState<EventItem | null>(
        null,
    );

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setEvents(await listAllEvents());
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

    // Opciones de los filtros: solo las categorías que aparecen en la lista.
    const categories = [
        ...new Map(events.map((e) => [e.category.id, e.category])).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
    const months = [
        ...new Set(events.map((e) => dayKey(e.startsAt).slice(0, 7))),
    ].sort((a, b) => b.localeCompare(a));

    const filtered = events.filter((event) => {
        if (categoryFilter && event.category.id !== categoryFilter) {
            return false;
        }

        if (
            monthFilter &&
            dayKey(event.startsAt).slice(0, 7) !== monthFilter
        ) {
            return false;
        }

        if (timeFilter === 'past' && !hasEnded(event)) return false;
        if (timeFilter === 'future' && hasEnded(event)) return false;

        if (search) {
            const q = search.trim().toLowerCase();
            const matches =
                event.title.toLowerCase().includes(q) ||
                (event.location?.toLowerCase().includes(q) ?? false);

            if (!matches) return false;
        }

        return true;
    });

    const { sorted, sort, toggleSort } = useSort<EventItem, SortKey>(
        filtered,
        {
            title: (a, b) => a.title.localeCompare(b.title),
            category: (a, b) => a.category.name.localeCompare(b.category.name),
            startsAt: (a, b) => a.startsAt.localeCompare(b.startsAt),
            location: (a, b) =>
                (a.location ?? '').localeCompare(b.location ?? ''),
            capacity: (a, b) => a._count.registrations - b._count.registrations,
        },
        { key: 'startsAt', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 25);

    const openEdit = (event: EventItem) => {
        setEditing(event);
        setEditOpen(true);
    };

    const openAttendees = (event: EventItem) => {
        setViewingAttendees(event);
        setAttendeesOpen(true);
    };

    return (
        <section>
            <h1 className="mb-6 text-2xl font-semibold">Eventos</h1>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Buscar por título o lugar…"
                    className="bg-card w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                    value={categoryFilter}
                    items={[
                        { value: '', label: 'Todas las categorías' },
                        ...categories.map((c) => ({
                            value: c.id,
                            label: c.name,
                        })),
                    ]}
                    onValueChange={(value) =>
                        setCategoryFilter(value ?? '')
                    }
                >
                    <SelectTrigger className="w-48 bg-card">
                        <SelectValue placeholder="Todas las categorías">
                            {(value: string | null) => {
                                const selected = categories.find(
                                    (c) => c.id === value,
                                );

                                if (!selected)
                                    return 'Todas las categorías';

                                return (
                                    <>
                                        <span
                                            className={cn(
                                                'size-3 shrink-0 rounded-full',
                                                CATEGORY_COLOR_STYLES[
                                                    selected.color
                                                ].swatch,
                                            )}
                                        />
                                        {selected.name}
                                    </>
                                );
                            }}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="" label="Todas las categorías">
                            Todas las categorías
                        </SelectItem>
                        {categories.map((c) => (
                            <SelectItem
                                key={c.id}
                                value={c.id}
                                label={c.name}
                            >
                                <span
                                    className={cn(
                                        'size-3 shrink-0 rounded-full',
                                        CATEGORY_COLOR_STYLES[c.color]
                                            .swatch,
                                    )}
                                />
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <select
                    className={selectClass}
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    <option value="">Todos los meses</option>
                    {months.map((key) => (
                        <option key={key} value={key}>
                            {monthLabelFrom(key)}
                        </option>
                    ))}
                </select>
                <select
                    className={selectClass}
                    value={timeFilter}
                    onChange={(e) =>
                        setTimeFilter(e.target.value as TimeFilter)
                    }
                >
                    <option value="all">Todos</option>
                    <option value="future">Futuros</option>
                    <option value="past">Pasados</option>
                </select>
            </div>

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando eventos…
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
                                <SortableHeader
                                    label="Título"
                                    sortKey="title"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Categoría"
                                    sortKey="category"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Fecha"
                                    sortKey="startsAt"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Lugar"
                                    sortKey="location"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <SortableHeader
                                    label="Aforo"
                                    sortKey="capacity"
                                    sort={sort}
                                    onSort={toggleSort}
                                />
                                <th className="p-3 font-bold">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((event) => (
                                <tr
                                    key={event.id}
                                    className={cn(
                                        'border-b last:border-0',
                                        hasEnded(event)
                                            ? 'bg-amber-500/10'
                                            : 'bg-brand-green/5',
                                    )}
                                >
                                    <td className="p-3">{event.title}</td>
                                    <td className="p-3">
                                        <Badge
                                            className={
                                                CATEGORY_COLOR_STYLES[
                                                    event.category.color
                                                ].chip
                                            }
                                        >
                                            {event.category.name}
                                        </Badge>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {formatShortDate(event.startsAt)},{' '}
                                        {formatTime(event.startsAt)} -{' '}
                                        {formatTime(event.endsAt)}
                                    </td>
                                    <td className="p-3">
                                        {event.location ?? '—'}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {attendanceLabel(event)}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <IconTooltip label="Ver participantes">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Ver participantes"
                                                    onClick={() =>
                                                        openAttendees(event)
                                                    }
                                                >
                                                    <Users className="size-4" />
                                                </Button>
                                            </IconTooltip>
                                            <IconTooltip label="Editar">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Editar"
                                                    onClick={() =>
                                                        openEdit(event)
                                                    }
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
                                                        setDeleting(event)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </IconTooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </OverlayScrollbarsComponent>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay eventos que coincidan con los filtros.
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

            <EventEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                event={editing}
                onSaved={() => void load()}
            />

            <AttendeesDialog
                open={attendeesOpen}
                onOpenChange={setAttendeesOpen}
                event={viewingAttendees}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar evento"
                    description={`¿Eliminar «${deleting.title}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el evento"
                    onConfirm={() => deleteEventById(deleting.id)}
                    onDeleted={() => {
                        setEvents((prev) =>
                            prev.filter((e) => e.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
