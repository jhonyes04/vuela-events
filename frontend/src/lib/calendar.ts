const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDay {
    // 'YYYY-MM-DD'
    key: string;
    // Día del mes (1-31)
    day: number;
    // false para los días de relleno del mes anterior o siguiente.
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

// Cuadrícula del mes: solo las semanas necesarias (4 a 6), de 7 días cada una.
// `month` va de 0 a 11 y `todayKey` es el 'YYYY-MM-DD' de hoy en Madrid.
// Se calcula en UTC sobre fechas de calendario, así no influyen los cambios de hora.
export const buildMonthGrid = (
    year: number,
    month: number,
    todayKey: string,
): CalendarDay[][] => {
    const first = Date.UTC(year, month, 1);
    // 0 = lunes ... 6 = domingo
    const leading = (new Date(first).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const weekCount = Math.ceil((leading + daysInMonth) / 7);

    const weeks: CalendarDay[][] = [];

    for (let w = 0; w < weekCount; w++) {
        const week: CalendarDay[] = [];

        for (let d = 0; d < 7; d++) {
            const date = new Date(first + (w * 7 + d - leading) * DAY_MS);
            const key = date.toISOString().slice(0, 10);

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
