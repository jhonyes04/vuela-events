import { useEffect, useState } from 'react';
import {
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/context';
import { IconTooltip } from '@/components/IconTooltip';
import {
    CreateEventDialog,
    CreateEventOnDayDialog,
} from '@/features/events/components/CreateEventDialog';
import { CalendarGrid } from '@/features/events/components/CalendarGrid';
import { CalendarLegend } from '@/features/events/components/CalendarLegend';
import { EventCard } from '@/features/events/components/EventCard';
import { EventDetailDialog } from '@/features/events/components/EventDetailDialog';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ComboboxField } from '@/components/ComboboxField';
import { FullScreenSpinner } from '@/components/FullScreenSpinner';
import { PageTitle } from '@/components/PageTitle';
import { useRangeEvents } from '@/features/events/hooks/useRangeEvents';
import { useCalendarStream } from '@/features/events/hooks/useCalendarStream';
import { today, useEventsStore } from '@/features/events/store';
import { buildMonthGrid, monthAnchor } from '@/features/events/lib/calendar';
import {
    dayKey,
    listEventYears,
    listMonthEvents,
    monthKey,
    monthName,
    type EventItem,
} from '@/features/events/lib/events';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: monthName(i),
}));

export function EventsPage() {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('events:create') ?? false;
    const canBackdate = user?.permissions.includes('events:backdate') ?? false;
    const anchor = useEventsStore((s) => s.anchor);
    const setAnchor = useEventsStore((s) => s.setAnchor);

    const [yearPart, monthPart] = anchor.split('-').map(Number);
    const year = yearPart!;
    const monthIndex = monthPart! - 1;

    const { events, loading, error, reload } = useRangeEvents(
        `month:${monthKey(year, monthIndex)}`,
        (signal) => listMonthEvents(year, monthIndex, signal),
    );

    useCalendarStream(reload);

    // Se guarda el id y una copia: al recargar, la ficha se refresca con el dato nuevo, pero no se cierra mientras llega.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<EventItem | null>(null);
    const [createDayKey, setCreateDayKey] = useState<string | null>(null);

    // Años con eventos, para el combobox de año; se incluye el año visible
    // aunque no tenga eventos aún, para no dejar el combobox sin selección.
    const [eventYears, setEventYears] = useState<number[]>([]);

    useEffect(() => {
        listEventYears()
            .then(setEventYears)
            .catch(() => setEventYears([]));
    }, []);

    const yearOptions = (
        eventYears.includes(year)
            ? eventYears
            : [...eventYears, year].sort((a, b) => a - b)
    ).map((y) => ({ value: String(y), label: String(y) }));

    const selectedEvent =
        selectedId === null
            ? null
            : (events.find((e) => e.id === selectedId) ?? snapshot);

    const openEvent = (event: EventItem) => {
        setSelectedId(event.id);
        setSnapshot(event);
    };

    const closeEvent = () => {
        setSelectedId(null);
        setSnapshot(null);
    };

    // Tras crear, la agenda se lleva al mes de la primera sesión y se recarga.
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
        setAnchor(monthAnchor(year, monthIndex + delta));
    };

    const selectMonth = (newMonth: number) => {
        setAnchor(monthAnchor(year, newMonth));
    };

    const selectYear = (newYear: number) => {
        setAnchor(monthAnchor(newYear, monthIndex));
    };

    const todayKey = today();
    const weeks = buildMonthGrid(year, monthIndex, todayKey);

    const handleSelectDay = (key: string) => {
        if (!canBackdate && key < todayKey) {
            toast.error('No se pueden crear eventos en días pasados.');
            return;
        }
        setCreateDayKey(key);
    };
    const prevLabel = 'Mes anterior';
    const nextLabel = 'Mes siguiente';

    const navControls = (
        <>
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

            <div className="flex items-center gap-2" aria-live="polite">
                <ComboboxField
                    className="w-32 bg-card"
                    items={MONTH_OPTIONS}
                    getValue={(m) => m.value}
                    getLabel={(m) => m.label}
                    value={String(monthIndex)}
                    onValueChange={(v) => selectMonth(Number(v))}
                    searchable={false}
                    placeholder="Mes"
                />
                <ComboboxField
                    className="w-24 bg-card"
                    items={yearOptions}
                    getValue={(y) => y.value}
                    getLabel={(y) => y.label}
                    value={String(year)}
                    onValueChange={(v) => selectYear(Number(v))}
                    searchable={false}
                    placeholder="Año"
                />
            </div>

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
        </>
    );

    const todayButton = (
        <Button variant="secondary" onClick={() => setAnchor(today())}>
            Hoy
        </Button>
    );

    const createButton = canCreate && (
        <CreateEventDialog onCreated={handleCreated} />
    );

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={CalendarRange} className="mb-0">
                    Eventos
                </PageTitle>
                <div className="sm:hidden">{createButton}</div>

                {/* Móvil: controles centrados en su propia fila. */}
                <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:hidden">
                    {navControls}
                    {/* {todayButton} */}
                </div>

                {/* Escritorio: todo en una sola fila. */}
                <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    {navControls}
                    {todayButton}
                    {createButton}
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

            {loading && <FullScreenSpinner label="Cargando eventos…" />}

            <CalendarGrid
                weeks={weeks}
                events={events}
                onSelectEvent={openEvent}
                onSelectDay={canCreate ? handleSelectDay : undefined}
            />
            <CalendarLegend events={events} />

            {!loading && events.length === 0 && !error && (
                <p className="mt-4 text-muted-foreground">
                    No hay eventos este mes.
                </p>
            )}

            {events.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[...events]
                        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                        .map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onOpen={openEvent}
                            />
                        ))}
                </div>
            )}

            <EventDetailDialog
                event={selectedEvent}
                onClose={closeEvent}
                onChanged={reload}
                onDeleted={handleDeleted}
            />

            <CreateEventOnDayDialog
                open={createDayKey !== null}
                onOpenChange={(open) => !open && setCreateDayKey(null)}
                initialDate={createDayKey}
                onCreated={(result) => {
                    setCreateDayKey(null);
                    handleCreated(result);
                }}
            />
        </section>
    );
}
