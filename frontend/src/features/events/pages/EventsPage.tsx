import { useState } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/context';
import { IconTooltip } from '@/components/IconTooltip';
import {
    CreateEventDialog,
    CreateEventOnDayDialog,
} from '@/features/events/components/CreateEventDialog';
import { CalendarGrid } from '@/features/events/components/CalendarGrid';
import { EventCard } from '@/features/events/components/EventCard';
import { EventDetailDialog } from '@/features/events/components/EventDetailDialog';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRangeEvents } from '@/features/events/hooks/useRangeEvents';
import { today, useEventsStore } from '@/features/events/store';
import {
    addDays,
    buildMonthGrid,
    buildWeekGrid,
    mondayKeyOf,
} from '@/features/events/lib/calendar';
import {
    dayKey,
    formatMonthLabel,
    formatWeekRangeLabel,
    listMonthEvents,
    listWeekEvents,
    monthKey,
    type EventItem,
} from '@/features/events/lib/events';

export function EventsPage() {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('events:create') ?? false;
    const view = useEventsStore((s) => s.view);
    const anchor = useEventsStore((s) => s.anchor);
    const setView = useEventsStore((s) => s.setView);
    const setAnchor = useEventsStore((s) => s.setAnchor);

    const [yearPart, monthPart] = anchor.split('-').map(Number);
    const year = yearPart!;
    const monthIndex = monthPart! - 1;
    const weekMondayKey = mondayKeyOf(anchor);

    const cacheKey =
        view === 'month'
            ? `month:${monthKey(year, monthIndex)}`
            : `week:${weekMondayKey}`;
    const fetchEvents =
        view === 'month'
            ? () => listMonthEvents(year, monthIndex)
            : () => listWeekEvents(weekMondayKey);

    const { events, loading, error, reload } = useRangeEvents(
        cacheKey,
        fetchEvents,
    );

    // Se guarda el id y una copia: al recargar, la ficha se refresca con el dato nuevo, pero no se cierra mientras llega.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<EventItem | null>(null);
    const selectedEvent =
        selectedId === null
            ? null
            : (events.find((e) => e.id === selectedId) ?? snapshot);

    const [newEventDay, setNewEventDay] = useState<string | null>(null);

    const openEvent = (event: EventItem) => {
        setSelectedId(event.id);
        setSnapshot(event);
    };

    const closeEvent = () => {
        setSelectedId(null);
        setSnapshot(null);
    };

    // Tras crear, la agenda se lleva al día de la primera sesión (su mes o su
    // semana, según la vista) y se recarga.
    const handleCreated = ({
        startsAt,
        count,
    }: {
        startsAt: string;
        count: number;
    }) => {
        setAnchor(dayKey(startsAt));
        toast.success(
            count === 1 ? 'Evento creado.' : `Se han creado ${count} sesiones.`,
        );
        reload();
    };

    const handleDeleted = () => {
        closeEvent();
        reload();
    };

    const shift = (delta: number) => {
        if (view === 'month') {
            const next = new Date(Date.UTC(year, monthIndex + delta, 1));
            const nextMonth = String(next.getUTCMonth() + 1).padStart(2, '0');

            setAnchor(`${next.getUTCFullYear()}-${nextMonth}-01`);
        } else {
            setAnchor(addDays(anchor, delta * 7));
        }
    };

    const todayKey = today();
    const weeks =
        view === 'month'
            ? buildMonthGrid(year, monthIndex, todayKey)
            : [buildWeekGrid(anchor, todayKey)];
    const prevLabel = view === 'month' ? 'Mes anterior' : 'Semana anterior';
    const nextLabel = view === 'month' ? 'Mes siguiente' : 'Semana siguiente';

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Eventos</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border p-0.5">
                        <Button
                            variant={view === 'month' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setView('month')}
                        >
                            Mes
                        </Button>
                        <Button
                            variant={view === 'week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setView('week')}
                        >
                            Semana
                        </Button>
                    </div>
                    <IconTooltip label={prevLabel}>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={prevLabel}
                            onClick={() => shift(-1)}
                        >
                            <ChevronLeft />
                        </Button>
                    </IconTooltip>
                    <span
                        className="min-w-40 text-center font-medium"
                        aria-live="polite"
                    >
                        {view === 'month'
                            ? formatMonthLabel(year, monthIndex)
                            : formatWeekRangeLabel(weekMondayKey)}
                    </span>
                    <IconTooltip label={nextLabel}>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={nextLabel}
                            onClick={() => shift(1)}
                        >
                            <ChevronRight />
                        </Button>
                    </IconTooltip>
                    <Button variant="secondary" onClick={() => setAnchor(today())}>
                        Hoy
                    </Button>
                    {canCreate && (
                        <CreateEventDialog onCreated={handleCreated} />
                    )}
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <CircleAlert />
                    <AlertTitle>No se pudieron cargar los eventos</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <AlertAction>
                        <Button variant="outline" size="sm" onClick={reload}>
                            Reintentar
                        </Button>
                    </AlertAction>
                </Alert>
            )}

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando eventos…
                </p>
            ) : (
                <>
                    <CalendarGrid
                        weeks={weeks}
                        events={events}
                        onSelectEvent={openEvent}
                        onSelectDay={canCreate ? setNewEventDay : undefined}
                    />

                    {events.length === 0 && !error && (
                        <p className="mt-4 text-muted-foreground">
                            No hay eventos{' '}
                            {view === 'month' ? 'este mes' : 'esta semana'}.
                        </p>
                    )}

                    {events.length > 0 && (
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {[...events]
                                .sort((a, b) =>
                                    a.startsAt.localeCompare(b.startsAt),
                                )
                                .map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onOpen={openEvent}
                                    />
                                ))}
                        </div>
                    )}
                </>
            )}

            <EventDetailDialog
                event={selectedEvent}
                onClose={closeEvent}
                onChanged={reload}
                onDeleted={handleDeleted}
            />

            <CreateEventOnDayDialog
                open={newEventDay !== null}
                onOpenChange={(open) => !open && setNewEventDay(null)}
                initialDate={newEventDay}
                onCreated={(result) => {
                    setNewEventDay(null);
                    handleCreated(result);
                }}
            />
        </section>
    );
}
