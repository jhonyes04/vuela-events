const TZ = 'Europe/Madrid';
const DAY_MS = 24 * 60 * 60 * 1000;

// Límites que acotan el trabajo del servidor ante una petición hostil.
export const MAX_OCCURRENCES = 200;
export const MAX_RANGE_DAYS = 731;

export interface RecurrenceRule {
    // Fechas 'YYYY-MM-DD' (calendario de Madrid), ambas incluidas.
    from: string;
    to: string;
    // Días ISO: 1 = lunes ... 7 = domingo.
    weekdays: number[];
    // Horas 'HH:mm' de Madrid.
    startTime: string;
    endTime: string;
}

export type RecurrenceFailure =
    | 'invalid_range'
    | 'range_too_long'
    | 'too_many'
    | 'empty';

export class RecurrenceError extends Error {
    readonly reason: RecurrenceFailure;

    constructor(reason: RecurrenceFailure) {
        super(reason);

        this.name = 'RecurrenceError';
        this.reason = reason;
    }
}

const wallClockFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

// Diferencia entre la hora de pared de Madrid y UTC en ese instante.
const madridOffsetMs = (instant: Date): number => {
    const parts = wallClockFormat.formatToParts(instant);
    const part = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value);
    const wallAsUtc = Date.UTC(
        part('year'),
        part('month') - 1,
        part('day'),
        part('hour'),
        part('minute'),
        part('second'),
    );

    return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

// Fecha 'YYYY-MM-DD' y hora 'HH:mm' de Madrid -> instante UTC.
// Respeta el horario de verano. Una hora inexistente (salto de primavera)
// se resuelve al instante más cercano, sin lanzar error.
export const madridLocalToUtc = (date: string, time: string): Date => {
    const asIfUtc = Date.parse(`${date}T${time}:00Z`);
    let instant = asIfUtc - madridOffsetMs(new Date(asIfUtc));

    // Segundo ajuste por si el primer cálculo cruzó un cambio de hora.
    instant = asIfUtc - madridOffsetMs(new Date(instant));

    return new Date(instant);
};

// Rechaza fechas que JavaScript "corrige" (p. ej. 2027-02-30 -> 2027-03-02).
export const isRealDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const parsed = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
};

export interface Occurrence {
    startsAt: Date;
    endsAt: Date;
}

export const expandRecurrence = (rule: RecurrenceRule): Occurrence[] => {
    if (
        !isRealDate(rule.from) ||
        !isRealDate(rule.to) ||
        rule.to < rule.from ||
        rule.endTime <= rule.startTime
    ) {
        throw new RecurrenceError('invalid_range');
    }

    const start = Date.parse(`${rule.from}T00:00:00Z`);
    const end = Date.parse(`${rule.to}T00:00:00Z`);

    // Se comprueba antes de iterar: el bucle nunca recorre más de MAX_RANGE_DAYS.
    if ((end - start) / DAY_MS > MAX_RANGE_DAYS) {
        throw new RecurrenceError('range_too_long');
    }

    const wanted = new Set(rule.weekdays);
    const occurrences: Occurrence[] = [];

    // Se recorre el calendario en UTC (sin cambios de hora): el día de la
    // semana de una fecha es el mismo en Madrid.
    for (let t = start; t <= end; t += DAY_MS) {
        const day = new Date(t);
        const isoWeekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();

        if (!wanted.has(isoWeekday)) continue;

        if (occurrences.length >= MAX_OCCURRENCES) {
            throw new RecurrenceError('too_many');
        }

        const date = day.toISOString().slice(0, 10);

        occurrences.push({
            startsAt: madridLocalToUtc(date, rule.startTime),
            endsAt: madridLocalToUtc(date, rule.endTime),
        });
    }

    if (occurrences.length === 0) {
        throw new RecurrenceError('empty');
    }

    return occurrences;
};
