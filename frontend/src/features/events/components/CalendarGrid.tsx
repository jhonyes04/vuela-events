import { useMemo } from 'react';
import { CircleCheck } from 'lucide-react';
import { WEEKDAY_HEADERS, type CalendarDay } from '@/features/events/lib/calendar';
import { eventColor } from '@/features/events/lib/eventColors';
import {
    formatDayLabel,
    formatTime,
    groupByDay,
    hasEnded,
    type EventItem,
} from '@/features/events/lib/events';
import { cn } from '@/lib/utils';

const MAX_CHIPS = 3;
const MAX_DOTS = 4;

// Rejilla de semanas (una sola fila para la vista de semana, varias para la
// de mes): el llamador decide qué cuadrícula construir (buildMonthGrid o
// buildWeekGrid), este componente solo la dibuja.
export function CalendarGrid({
    weeks,
    events,
    onSelectEvent,
    onSelectDay,
}: {
    weeks: CalendarDay[][];
    events: EventItem[];
    onSelectEvent: (event: EventItem) => void;
    onSelectDay?: (dayKey: string) => void;
}) {
    const byDay = useMemo(
        () => new Map(groupByDay(events).map((g) => [g.key, g.events])),
        [events],
    );

    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-bold text-muted-foreground">
                {WEEKDAY_HEADERS.map((d) => (
                    <div key={d.short} className="py-2">
                        <span className="sr-only">{d.long}</span>
                        <span className="sm:hidden" aria-hidden="true">
                            {d.short}
                        </span>
                        <span className="hidden sm:inline" aria-hidden="true">
                            {d.long}
                        </span>
                    </div>
                ))}
            </div>

            {weeks.map((week) => (
                <div
                    key={week[0]!.key}
                    className="grid grid-cols-7 border-b last:border-b-0"
                >
                    {week.map((day) => {
                        const list = byDay.get(day.key) ?? [];
                        const count = list.length;
                        const dayLabel = `${formatDayLabel(day.key)}, ${count === 0 ? 'sin eventos' : count === 1 ? '1 evento' : `${count} eventos`}`;

                        const numberClass = cn(
                            'flex size-7 items-center justify-center rounded-full text-sm font-medium',
                            !day.inMonth && 'text-muted-foreground',
                            day.isToday && 'bg-primary text-primary-foreground',
                        );

                        return (
                            <div
                                key={day.key}
                                onClick={() => onSelectDay?.(day.key)}
                                className={cn(
                                    'min-h-16 min-w-0 border-r p-1 last:border-r-0 md:min-h-28',
                                    !day.inMonth && 'bg-muted/40',
                                    onSelectDay &&
                                        'cursor-pointer hover:bg-muted/50',
                                )}
                            >
                                {onSelectDay ? (
                                    <button
                                        type="button"
                                        aria-current={
                                            day.isToday ? 'date' : undefined
                                        }
                                        aria-label={`Crear evento el ${dayLabel}`}
                                        className={cn(
                                            numberClass,
                                            'cursor-pointer',
                                        )}
                                    >
                                        {day.day}
                                    </button>
                                ) : (
                                    <span
                                        aria-current={
                                            day.isToday ? 'date' : undefined
                                        }
                                        aria-label={dayLabel}
                                        className={numberClass}
                                    >
                                        {day.day}
                                    </span>
                                )}

                                {/* Pantallas grandes: etiquetas con hora y título. */}
                                <ul className="mt-1 hidden gap-0.5 md:grid">
                                    {list.slice(0, MAX_CHIPS).map((event) => (
                                        <li key={event.id} className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectEvent(event);
                                                }}
                                                title={`${formatTime(event.startsAt)} ${event.title}`}
                                                className={cn(
                                                    'block w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-xs font-medium',
                                                    eventColor(event).chip,
                                                    event.registered &&
                                                        'ring-2 ring-brand-green',
                                                    hasEnded(event) &&
                                                        'opacity-60',
                                                )}
                                            >
                                                <span className="tabular-nums">
                                                    {formatTime(event.startsAt)}
                                                </span>{' '}
                                                {event.title}
                                                {hasEnded(event) && (
                                                    <>
                                                        <CircleCheck
                                                            aria-hidden="true"
                                                            className="ml-1 inline size-3"
                                                        />
                                                        <span className="sr-only">
                                                            {' '}
                                                            (finalizado)
                                                        </span>
                                                    </>
                                                )}
                                                {event.registered && (
                                                    <span className="sr-only">
                                                        {' '}
                                                        (inscrito)
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                    {count > MAX_CHIPS && (
                                        <li className="px-1.5 text-xs font-medium text-muted-foreground">
                                            +{count - MAX_CHIPS} más
                                        </li>
                                    )}
                                </ul>

                                {/* Móvil: puntos de color; el detalle sale al tocar el día. */}
                                {count > 0 && (
                                    <div
                                        aria-hidden="true"
                                        className="mt-1 flex flex-wrap gap-0.5 md:hidden"
                                    >
                                        {list
                                            .slice(0, MAX_DOTS)
                                            .map((event) => (
                                                <span
                                                    key={event.id}
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        eventColor(event).dot,
                                                        hasEnded(event) &&
                                                            'opacity-40',
                                                    )}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
