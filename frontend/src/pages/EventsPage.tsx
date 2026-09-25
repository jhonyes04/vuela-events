import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
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
    formatDayLabel,
    formatMonthLabel,
    groupByDay,
} from '@/lib/events';

// Mes actual según la hora de Madrid.
const currentMonth = () => {
    const [year, month] = dayKey(new Date().toISOString())
        .split('-')
        .map(Number);

    return { year: year!, month: month! - 1 };
};

export function EventsPage() {
    const [cursor, setCursor] = useState(currentMonth);
    const { events, loading, error, reload } = useMonthEvents(
        cursor.year,
        cursor.month,
    );
    const days = useMemo(() => groupByDay(events), [events]);

    const shift = (delta: number) =>
        setCursor(({ year, month }) => {
            const next = new Date(Date.UTC(year, month + delta, 1));

            return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
        });

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Eventos</h1>
                <div className="flex items-center gap-2">
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
                        onClick={() => setCursor(currentMonth())}
                    >
                        Hoy
                    </Button>
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
            ) : days.length === 0 && !error ? (
                <p className="text-muted-foreground">
                    No hay eventos este mes.
                </p>
            ) : (
                days.map((day) => (
                    <section key={day.key} className="mb-8">
                        <h2 className="mb-3 text-lg font-semibold">
                            {formatDayLabel(day.key)}
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            {day.events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </section>
    );
}
