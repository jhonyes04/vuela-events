import { describe, expect, it } from 'vitest';
import { addDays, buildMonthGrid, buildWeekGrid, mondayKeyOf } from './calendar';

const keys = (weeks: ReturnType<typeof buildMonthGrid>) =>
    weeks.flat().map((d) => d.key);

describe('buildMonthGrid', () => {
    it('septiembre de 2026 (empieza en martes): 5 semanas, de lunes 31-ago a domingo 4-oct', () => {
        const weeks = buildMonthGrid(2026, 8, '2026-09-23');

        expect(weeks).toHaveLength(5);
        expect(weeks.every((w) => w.length === 7)).toBe(true);
        expect(weeks[0]![0]).toMatchObject({ key: '2026-08-31', inMonth: false });
        expect(weeks[0]![1]).toMatchObject({ key: '2026-09-01', inMonth: true, day: 1 });
        expect(weeks[4]![6]).toMatchObject({ key: '2026-10-04', inMonth: false });
    });

    it('febrero de 2027 (empieza en lunes y tiene 28 días): exactamente 4 semanas sin relleno', () => {
        const weeks = buildMonthGrid(2027, 1, '2027-01-01');

        expect(weeks).toHaveLength(4);
        expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
        expect(weeks[0]![0]!.key).toBe('2027-02-01');
        expect(weeks[3]![6]!.key).toBe('2027-02-28');
    });

    it('febrero de 2028 es bisiesto: incluye el 29', () => {
        const days = buildMonthGrid(2028, 1, '2028-01-01').flat();

        expect(days.find((d) => d.key === '2028-02-29')?.inMonth).toBe(true);
        expect(days.filter((d) => d.inMonth)).toHaveLength(29);
    });

    it('agosto de 2027 empieza en domingo y necesita 6 semanas', () => {
        const weeks = buildMonthGrid(2027, 7, '2027-01-01');

        expect(weeks).toHaveLength(6);
        expect(weeks[0]![0]!.key).toBe('2027-07-26');
        expect(weeks[0]![6]!.key).toBe('2027-08-01');
        expect(weeks[5]![6]!.key).toBe('2027-09-05');
    });

    it('diciembre de 2026 cruza el año: termina el domingo 3 de enero de 2027', () => {
        const weeks = buildMonthGrid(2026, 11, '2026-01-01');

        expect(weeks).toHaveLength(5);
        expect(weeks[0]![0]!.key).toBe('2026-11-30');
        expect(weeks[4]![6]).toMatchObject({ key: '2027-01-03', inMonth: false });
    });

    it('los días son consecutivos, sin saltos ni repetidos, también con cambios de hora', () => {
        // Marzo y octubre tienen cambio de hora en Madrid.
        for (const [year, month] of [
            [2026, 2],
            [2026, 9],
            [2027, 2],
            [2027, 9],
        ] as const) {
            const all = keys(buildMonthGrid(year, month, '2000-01-01'));

            expect(new Set(all).size).toBe(all.length);

            for (let i = 1; i < all.length; i++) {
                const gap =
                    (Date.parse(`${all[i]}T00:00:00Z`) -
                        Date.parse(`${all[i - 1]}T00:00:00Z`)) /
                    86_400_000;

                expect(gap).toBe(1);
            }
        }
    });

    it('marca como hoy solo el día indicado, y ninguno si no está en la cuadrícula', () => {
        const today = buildMonthGrid(2026, 8, '2026-09-23').flat().filter((d) => d.isToday);

        expect(today).toHaveLength(1);
        expect(today[0]!.key).toBe('2026-09-23');
        expect(
            buildMonthGrid(2026, 8, '2027-05-05').flat().some((d) => d.isToday),
        ).toBe(false);
    });

    it('la primera columna siempre es lunes y la última domingo', () => {
        const weekday = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();

        for (let month = 0; month < 12; month++) {
            for (const week of buildMonthGrid(2027, month, '2000-01-01')) {
                expect(weekday(week[0]!.key)).toBe(1);
                expect(weekday(week[6]!.key)).toBe(0);
            }
        }
    });
});

describe('mondayKeyOf', () => {
    it('devuelve el lunes de la semana, para cualquier día de esa semana', () => {
        expect(mondayKeyOf('2026-09-23')).toBe('2026-09-21');
        expect(mondayKeyOf('2026-09-21')).toBe('2026-09-21');
        expect(mondayKeyOf('2026-09-27')).toBe('2026-09-21');
    });

    it('cruza de mes y de año correctamente', () => {
        expect(mondayKeyOf('2026-10-01')).toBe('2026-09-28');
        expect(mondayKeyOf('2027-01-01')).toBe('2026-12-28');
    });
});

describe('addDays', () => {
    it('suma y resta días, cruzando meses', () => {
        expect(addDays('2026-09-28', 7)).toBe('2026-10-05');
        expect(addDays('2026-10-05', -7)).toBe('2026-09-28');
    });
});

describe('buildWeekGrid', () => {
    it('siempre 7 días, de lunes a domingo, todos inMonth', () => {
        const week = buildWeekGrid('2026-09-23', '2000-01-01');

        expect(week).toHaveLength(7);
        expect(week[0]!.key).toBe('2026-09-21');
        expect(week[6]!.key).toBe('2026-09-27');
        expect(week.every((d) => d.inMonth)).toBe(true);
    });

    it('marca hoy solo si cae en esa semana', () => {
        expect(
            buildWeekGrid('2026-09-23', '2026-09-25').filter((d) => d.isToday),
        ).toHaveLength(1);
        expect(
            buildWeekGrid('2026-09-23', '2026-10-01').some((d) => d.isToday),
        ).toBe(false);
    });
});
