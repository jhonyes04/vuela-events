import { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
} from 'lucide-react';
import { useAuth } from '@/auth/context';
import { CreateEventDialog } from '@/components/CreateEventDialog';
// import { EventCard } from '@/components/EventCard';
import { EventDetailDialog } from '@/components/EventDetailDialog';
import { MonthCalendar } from '@/components/MonthCalendar';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useMonthEvents } from '@/hooks/useMonthEvents';
import {
    dayKey,
    // formatDayLabel,
    formatMonthLabel,
    // groupByDay,
    type EventItem,
} from '@/lib/events';

// Mes actual según la hora de Madrid.
const currentMonth = () => {
    const [year, month] = dayKey(new Date().toISOString())
        .split('-')
        .map(Number);

    return { year: year!, month: month! - 1 };
};

export function EventsPage() {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('events:create') ?? false;
    const [cursor, setCursor] = useState(currentMonth);
    const { events, loading, error, reload } = useMonthEvents(
        cursor.year,
        cursor.month,
    );
    // const byDay = useMemo(
    //     () => new Map(groupByDay(events).map((g) => [g.key, g.events])),
    //     [events],
    // );

    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    // Se guarda el id y una copia: al recargar, la ficha se refresca con el dato
    // nuevo, pero no se cierra mientras llega.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<EventItem | null>(null);
    const selectedEvent =
        selectedId === null
            ? null
            : (events.find((e) => e.id === selectedId) ?? snapshot);
    // Mensaje de éxito tras crear o eliminar.
    const [notice, setNotice] = useState<string | null>(null);

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
        const [year, month] = dayKey(startsAt).split('-').map(Number);

        setCursor({ year: year!, month: month! - 1 });
        setSelectedDay(null);
        setNotice(
            count === 1 ? 'Evento creado.' : `Se han creado ${count} sesiones.`,
        );
        reload();
    };

    const handleDeleted = (title: string) => {
        closeEvent();
        setNotice(`Sesión «${title}» eliminada.`);
        reload();
    };

    const goTo = (next: { year: number; month: number }) => {
        setNotice(null);
        setSelectedDay(null);
        setCursor(next);
    };

    const shift = (delta: number) => {
        const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));

        goTo({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    };

    const todayKey = dayKey(new Date().toISOString());
    // const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Eventos</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Mes anterior"
                        onClick={() => shift(-1)}
                    >
                        <ChevronLeft />
                    </Button>
                    <span
                        className="min-w-40 text-center font-medium"
                        aria-live="polite"
                    >
                        {formatMonthLabel(cursor.year, cursor.month)}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Mes siguiente"
                        onClick={() => shift(1)}
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => goTo(currentMonth())}
                    >
                        Hoy
                    </Button>
                    {canCreate && (
                        <CreateEventDialog onCreated={handleCreated} />
                    )}
                </div>
            </div>

            {notice && (
                <Alert variant="success" className="mb-6">
                    <CircleCheck />
                    <AlertTitle>{notice}</AlertTitle>
                    <AlertAction>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotice(null)}
                        >
                            Cerrar
                        </Button>
                    </AlertAction>
                </Alert>
            )}

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
                    <MonthCalendar
                        year={cursor.year}
                        month={cursor.month}
                        todayKey={todayKey}
                        events={events}
                        selectedDay={selectedDay}
                        onSelectDay={setSelectedDay}
                        onSelectEvent={openEvent}
                    />

                    {events.length === 0 && !error && (
                        <p className="mt-4 text-muted-foreground">
                            No hay eventos este mes.
                        </p>
                    )}

                    {/* {selectedDay && (
                        <section className="mt-6" aria-live="polite">
                            <h2 className="mb-3 text-lg font-semibold">
                                {formatDayLabel(selectedDay)}
                            </h2>
                            {dayEvents.length === 0 ? (
                                <p className="text-muted-foreground">
                                    No hay eventos este día.
                                </p>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {dayEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onOpen={openEvent}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )} */}
                </>
            )}

            <EventDetailDialog
                event={selectedEvent}
                onClose={closeEvent}
                onChanged={reload}
                onDeleted={handleDeleted}
            />
        </section>
    );
}
