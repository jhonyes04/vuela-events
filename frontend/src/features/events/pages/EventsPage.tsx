import { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheck,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { IconTooltip } from '@/components/IconTooltip';
import {
    CreateEventDialog,
    CreateEventOnDayDialog,
} from '@/features/events/components/CreateEventDialog';
import { EventCard } from '@/features/events/components/EventCard';
import { EventDetailDialog } from '@/features/events/components/EventDetailDialog';
import { MonthCalendar } from '@/features/events/components/MonthCalendar';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useMonthEvents } from '@/features/events/hooks/useMonthEvents';
import { currentMonth, useEventsStore } from '@/features/events/store';
import {
    dayKey,
    formatMonthLabel,
    type EventItem,
} from '@/features/events/lib/events';

export function EventsPage() {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('events:create') ?? false;
    const cursor = useEventsStore((s) => s.cursor);
    const setCursor = useEventsStore((s) => s.setCursor);
    const { events, loading, error, reload } = useMonthEvents(
        cursor.year,
        cursor.month,
    );
    // Se guarda el id y una copia: al recargar, la ficha se refresca con el dato nuevo, pero no se cierra mientras llega.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<EventItem | null>(null);
    const selectedEvent =
        selectedId === null
            ? null
            : (events.find((e) => e.id === selectedId) ?? snapshot);

    const [newEventDay, setNewEventDay] = useState<string | null>(null);
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
        setNotice(
            count === 1 ? 'Evento creado.' : `Se han creado ${count} sesiones.`,
        );
        reload();
    };

    const handleDeleted = (message: string) => {
        closeEvent();
        setNotice(message);
        reload();
    };

    const goTo = (next: { year: number; month: number }) => {
        setNotice(null);
        setCursor(next);
    };

    const shift = (delta: number) => {
        const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));

        goTo({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    };

    const todayKey = dayKey(new Date().toISOString());

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Eventos</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <IconTooltip label="Mes anterior">
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Mes anterior"
                            onClick={() => shift(-1)}
                        >
                            <ChevronLeft />
                        </Button>
                    </IconTooltip>
                    <span
                        className="min-w-40 text-center font-medium"
                        aria-live="polite"
                    >
                        {formatMonthLabel(cursor.year, cursor.month)}
                    </span>
                    <IconTooltip label="Mes siguiente">
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Mes siguiente"
                            onClick={() => shift(1)}
                        >
                            <ChevronRight />
                        </Button>
                    </IconTooltip>
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
                        onSelectEvent={openEvent}
                        onSelectDay={canCreate ? setNewEventDay : undefined}
                    />

                    {events.length === 0 && !error && (
                        <p className="mt-4 text-muted-foreground">
                            No hay eventos este mes.
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
