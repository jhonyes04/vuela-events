const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDay {
    // 'YYYY-MM-DD'
    key: string;
    // Día del mes (1-31)
    day: number;
    // false para los días de relleno del mes anterior o siguiente (siempre
    // true en la vista de semana, que no tiene ese concepto).
    inMonth: boolean;
    isToday: boolean;
}

// La semana empieza en lunes.
export const WEEKDAY_HEADERS = [
    { short: 'L', long: 'Lunes' },
    { short: 'M', long: 'Martes' },
    { short: 'X', long: 'Miércoles' },
    { short: 'J', long: 'Jueves' },
    { short: 'V', long: 'Viernes' },
    { short: 'S', long: 'Sábado' },
    { short: 'D', long: 'Domingo' },
] as const;

// 0 = lunes ... 6 = domingo.
const mondayOffset = (date: Date): number => (date.getUTCDay() + 6) % 7;

const toKey = (date: Date): string => date.toISOString().slice(0, 10);

const dayFromKey = (key: string): Date => {
    const [year, month, day] = key.split('-').map(Number);

    return new Date(Date.UTC(year!, month! - 1, day!));
};

// 'YYYY-MM-DD' del lunes de la semana que contiene `key`.
export const mondayKeyOf = (key: string): string => {
    const date = dayFromKey(key);

    return toKey(new Date(date.getTime() - mondayOffset(date) * DAY_MS));
};

// Suma (o resta, con delta negativo) días a una fecha 'YYYY-MM-DD'.
export const addDays = (key: string, delta: number): string =>
    toKey(new Date(dayFromKey(key).getTime() + delta * DAY_MS));

// Cuadrícula del mes: solo las semanas necesarias (4 a 6), de 7 días cada una.
// `month` va de 0 a 11 y `todayKey` es el 'YYYY-MM-DD' de hoy en Madrid.
// Se calcula en UTC sobre fechas de calendario, así no influyen los cambios de hora.
export const buildMonthGrid = (
    year: number,
    month: number,
    todayKey: string,
): CalendarDay[][] => {
    const first = Date.UTC(year, month, 1);
    const leading = mondayOffset(new Date(first));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const weekCount = Math.ceil((leading + daysInMonth) / 7);

    const weeks: CalendarDay[][] = [];

    for (let w = 0; w < weekCount; w++) {
        const week: CalendarDay[] = [];

        for (let d = 0; d < 7; d++) {
            const date = new Date(first + (w * 7 + d - leading) * DAY_MS);
            const key = toKey(date);

            week.push({
                key,
                day: date.getUTCDate(),
                inMonth:
                    date.getUTCFullYear() === year &&
                    date.getUTCMonth() === month,
                isToday: key === todayKey,
            });
        }

        weeks.push(week);
    }

    return weeks;
};

// La semana (lunes a domingo) que contiene `key`: una sola fila de 7 días.
export const buildWeekGrid = (
    key: string,
    todayKey: string,
): CalendarDay[] => {
    const monday = dayFromKey(mondayKeyOf(key));

    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday.getTime() + i * DAY_MS);
        const dayKeyValue = toKey(date);

        return {
            key: dayKeyValue,
            day: date.getUTCDate(),
            inMonth: true,
            isToday: dayKeyValue === todayKey,
        };
    });
};
