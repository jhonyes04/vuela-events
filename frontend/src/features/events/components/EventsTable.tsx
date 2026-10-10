import { useState, type ReactNode } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PaginationControls } from '@/components/PaginationControls';
import { SortableHeader } from '@/components/SortableHeader';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { PROJECT_COLOR_STYLES } from '@/features/projects/lib/colors';
import { cn } from '@/lib/utils';
import {
    attendanceLabel,
    dayKey,
    formatMonthLabel,
    formatShortDate,
    formatTime,
    hasEnded,
    type EventItem,
} from '@/features/events/lib/events';

const selectClass =
    'h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

type SortKey =
    | 'title'
    | 'category'
    | 'startsAt'
    | 'location'
    | 'capacity'
    | 'participants';

type TimeFilter = 'all' | 'past' | 'future';

// 'YYYY-MM' -> 'Septiembre de 2026'
const monthLabelFrom = (key: string): string => {
    const [year, month] = key.split('-').map(Number);

    return formatMonthLabel(year!, month! - 1);
};

interface EventsTableProps {
    events: EventItem[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    searchPlaceholder: string;
    matchesSearch: (event: EventItem, query: string) => boolean;
    defaultTimeFilter: TimeFilter;
    showCapacity?: boolean;
    showParticipants?: boolean;
    renderActions: (event: EventItem) => ReactNode;
}

// Tabla de eventos con búsqueda, filtros (categoría/mes/periodo), orden y
// paginación. La comparten la gestión de eventos y "Mis eventos": solo
// cambian los datos, las acciones por fila y si se muestra el aforo.
export const EventsTable = ({
    events,
    loading,
    error,
    onRetry,
    searchPlaceholder,
    matchesSearch,
    defaultTimeFilter,
    showCapacity = false,
    showParticipants = false,
    renderActions,
}: EventsTableProps) => {
    const [search, setSearch] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>(defaultTimeFilter);

    // Opciones de los filtros: solo los proyectos/meses que aparecen en la lista.
    const projects = [
        ...new Map(events.map((e) => [e.project.id, e.project])).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
    const months = [
        ...new Set(events.map((e) => dayKey(e.startsAt).slice(0, 7))),
    ].sort((a, b) => b.localeCompare(a));

    const filtered = events.filter((event) => {
        if (projectFilter && event.project.id !== projectFilter) {
            return false;
        }

        if (monthFilter && dayKey(event.startsAt).slice(0, 7) !== monthFilter) {
            return false;
        }

        if (timeFilter === 'past' && !hasEnded(event)) return false;
        if (timeFilter === 'future' && hasEnded(event)) return false;

        if (search && !matchesSearch(event, search.trim().toLowerCase())) {
            return false;
        }

        return true;
    });

    const { sorted, sort, toggleSort } = useSort<EventItem, SortKey>(
        filtered,
        {
            title: (a, b) => a.title.localeCompare(b.title),
            category: (a, b) => a.project.name.localeCompare(b.project.name),
            startsAt: (a, b) => a.startsAt.localeCompare(b.startsAt),
            location: (a, b) =>
                (a.location ?? '').localeCompare(b.location ?? ''),
            capacity: (a, b) => a._count.registrations - b._count.registrations,
            participants: (a, b) =>
                (a.participantsCount ?? -1) - (b.participantsCount ?? -1),
        },
        { key: 'startsAt', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    return (
        <>
            <ListErrors error={error} actionError={null} onRetry={onRetry} />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder={searchPlaceholder}
                    className="bg-card w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                    value={projectFilter}
                    items={[
                        { value: '', label: 'Todos los proyectos' },
                        ...projects.map((c) => ({
                            value: c.id,
                            label: c.name,
                        })),
                    ]}
                    onValueChange={(value) => setProjectFilter(value ?? '')}
                >
                    <SelectTrigger className="w-48 bg-card">
                        <SelectValue placeholder="Todos los proyectos">
                            {(value: string | null) => {
                                const selected = projects.find(
                                    (c) => c.id === value,
                                );

                                if (!selected) return 'Todos los proyectos';

                                return (
                                    <>
                                        <span
                                            className={cn(
                                                'size-3 shrink-0 rounded-full',
                                                PROJECT_COLOR_STYLES[
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
                        <SelectItem value="" label="Todos los proyectos">
                            Todos los proyectos
                        </SelectItem>
                        {projects.map((c) => (
                            <SelectItem key={c.id} value={c.id} label={c.name}>
                                <span
                                    className={cn(
                                        'size-3 shrink-0 rounded-full',
                                        PROJECT_COLOR_STYLES[c.color].swatch,
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
                                    label="Proyecto"
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
                                {showCapacity && (
                                    <SortableHeader
                                        label="Participantes"
                                        sortKey="capacity"
                                        sort={sort}
                                        onSort={toggleSort}
                                    />
                                )}
                                {showParticipants && (
                                    <SortableHeader
                                        label="Atendidos"
                                        sortKey="participants"
                                        sort={sort}
                                        onSort={toggleSort}
                                    />
                                )}
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
                                                PROJECT_COLOR_STYLES[
                                                    event.project.color
                                                ].chip
                                            }
                                        >
                                            {event.project.name}
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
                                    {showCapacity && (
                                        <td className="p-3 whitespace-nowrap">
                                            {attendanceLabel(event)}
                                        </td>
                                    )}
                                    {showParticipants && (
                                        <td className="p-3 text-right whitespace-nowrap">
                                            {event.participantsCount ?? '—'}
                                        </td>
                                    )}
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {renderActions(event)}
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
        </>
    );
};
