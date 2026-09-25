import { useMemo } from 'react';
import { buildMonthGrid, WEEKDAY_HEADERS } from '@/lib/calendar';
import { eventColor } from '@/lib/eventColors';
import {
    formatDayLabel,
    formatTime,
    groupByDay,
    type EventItem,
} from '@/lib/events';
import { cn } from '@/lib/utils';

const MAX_CHIPS = 3;
const MAX_DOTS = 4;

export function MonthCalendar({
    year,
    month,
    todayKey,
    events,
    selectedDay,
    onSelectDay,
    onSelectEvent,
}: {
    year: number;
    month: number;
    todayKey: string;
    events: EventItem[];
    selectedDay: string | null;
    onSelectDay: (key: string) => void;
    onSelectEvent: (event: EventItem) => void;
}) {
    const weeks = useMemo(
        () => buildMonthGrid(year, month, todayKey),
        [year, month, todayKey],
    );
    const byDay = useMemo(
        () => new Map(groupByDay(events).map((g) => [g.key, g.events])),
        [events],
    );

    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-medium text-muted-foreground">
                {WEEKDAY_HEADERS.map((d) => (
                    <div key={d.short} className="py-2">
                        <span aria-hidden="true">{d.short}</span>
                        <span className="sr-only">{d.long}</span>
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

                        return (
                            <div
                                key={day.key}
                                className={cn(
                                    'min-h-16 min-w-0 border-r p-1 last:border-r-0 md:min-h-28',
                                    !day.inMonth && 'bg-muted/40',
                                    selectedDay === day.key &&
                                        'outline-2 -outline-offset-2 outline-ring',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectDay(day.key)}
                                    aria-current={day.isToday ? 'date' : undefined}
                                    aria-label={`${formatDayLabel(day.key)}, ${
                                        count === 0
                                            ? 'sin eventos'
                                            : count === 1
                                              ? '1 evento'
                                              : `${count} eventos`
                                    }`}
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full text-sm font-medium hover:bg-accent',
                                        !day.inMonth && 'text-muted-foreground',
                                        day.isToday &&
                                            'bg-primary text-primary-foreground hover:bg-primary/80',
                                    )}
                                >
                                    {day.day}
                                </button>

                                {/* Pantallas grandes: etiquetas con hora y título. */}
                                <ul className="mt-1 hidden gap-0.5 md:grid">
                                    {list.slice(0, MAX_CHIPS).map((event) => (
                                        <li key={event.id} className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => onSelectEvent(event)}
                                                title={`${formatTime(event.startsAt)} ${event.title}`}
                                                className={cn(
                                                    'block w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium',
                                                    eventColor(event).chip,
                                                    event.registered &&
                                                        'ring-2 ring-brand-green',
                                                )}
                                            >
                                                <span className="tabular-nums">
                                                    {formatTime(event.startsAt)}
                                                </span>{' '}
                                                {event.title}
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
                                        <li>
                                            <button
                                                type="button"
                                                onClick={() => onSelectDay(day.key)}
                                                className="w-full rounded px-1.5 text-left text-xs font-medium text-muted-foreground hover:underline"
                                            >
                                                +{count - MAX_CHIPS} más
                                            </button>
                                        </li>
                                    )}
                                </ul>

                                {/* Móvil: puntos de color; el detalle sale al tocar el día. */}
                                {count > 0 && (
                                    <div
                                        aria-hidden="true"
                                        className="mt-1 flex flex-wrap gap-0.5 md:hidden"
                                    >
                                        {list.slice(0, MAX_DOTS).map((event) => (
                                            <span
                                                key={event.id}
                                                className={cn(
                                                    'size-2 rounded-full',
                                                    eventColor(event).dot,
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
