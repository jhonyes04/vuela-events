import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    expandRecurrence,
    isRealDate,
    madridLocalToUtc,
    MAX_OCCURRENCES,
    RecurrenceError,
    type RecurrenceRule,
} from './recurrence.js';

const rule = (over: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
    from: '2027-01-01',
    to: '2027-12-31',
    weekdays: [3],
    startTime: '09:00',
    endTime: '13:00',
    ...over,
});

const assertFails = (r: RecurrenceRule, reason: string) =>
    assert.throws(
        () => expandRecurrence(r),
        (e) => e instanceof RecurrenceError && e.reason === reason,
    );

const madridWeekday = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        weekday: 'short',
    }).format(d);

describe('madridLocalToUtc', () => {
    it('verano (UTC+2)', () => {
        assert.equal(
            madridLocalToUtc('2026-09-23', '09:00').toISOString(),
            '2026-09-23T07:00:00.000Z',
        );
    });

    it('invierno (UTC+1)', () => {
        assert.equal(
            madridLocalToUtc('2027-01-13', '09:00').toISOString(),
            '2027-01-13T08:00:00.000Z',
        );
    });

    it('medianoche: cruza al día anterior en UTC', () => {
        assert.equal(
            madridLocalToUtc('2026-10-01', '00:30').toISOString(),
            '2026-09-30T22:30:00.000Z',
        );
    });

    it('días de cambio de hora', () => {
        assert.equal(
            madridLocalToUtc('2026-10-25', '10:00').toISOString(),
            '2026-10-25T09:00:00.000Z',
        );
        assert.equal(
            madridLocalToUtc('2026-03-29', '10:00').toISOString(),
            '2026-03-29T08:00:00.000Z',
        );
    });
});

describe('isRealDate', () => {
    it('acepta fechas reales y rechaza las que JavaScript corrige', () => {
        assert.equal(isRealDate('2027-02-28'), true);
        assert.equal(isRealDate('2028-02-29'), true);
        assert.equal(isRealDate('2027-02-29'), false);
        assert.equal(isRealDate('2027-02-30'), false);
        assert.equal(isRealDate('2027-13-01'), false);
        assert.equal(isRealDate('27-01-01'), false);
        assert.equal(isRealDate('no-es-fecha'), false);
    });
});

describe('expandRecurrence', () => {
    it('todos los miércoles de 2027: 52 sesiones, todas en miércoles de Madrid', () => {
        const list = expandRecurrence(rule());

        assert.equal(list.length, 52);
        assert.ok(list.every((o) => madridWeekday(o.startsAt) === 'Wed'));
        assert.equal(list[0]?.startsAt.toISOString(), '2027-01-06T08:00:00.000Z');
    });

    it('cada sesión mantiene la hora de Madrid a lo largo del año (verano e invierno)', () => {
        const list = expandRecurrence(rule());
        const hour = (d: Date) =>
            new Intl.DateTimeFormat('es-ES', {
                timeZone: 'Europe/Madrid',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            }).format(d);

        assert.ok(list.every((o) => hour(o.startsAt) === '09:00'));
        assert.ok(list.every((o) => hour(o.endsAt) === '13:00'));
        // En enero es UTC+1 y en julio UTC+2: los instantes UTC difieren.
        const july = list.find((o) => o.startsAt.getUTCMonth() === 6);

        assert.equal(july?.startsAt.getUTCHours(), 7);
        assert.equal(list[0]?.startsAt.getUTCHours(), 8);
    });

    it('varios días de la semana: lunes y miércoles de enero de 2027', () => {
        const list = expandRecurrence(
            rule({ from: '2027-01-01', to: '2027-01-31', weekdays: [1, 3] }),
        );

        // Lunes 4, miércoles 6, lunes 11, miércoles 13... (el 1 de enero es viernes).
        assert.deepEqual(
            list.map((o) => madridWeekday(o.startsAt)),
            ['Mon', 'Wed', 'Mon', 'Wed', 'Mon', 'Wed', 'Mon', 'Wed'],
        );
        assert.deepEqual(
            list.map((o) => o.startsAt.toISOString().slice(0, 10)),
            [
                '2027-01-04',
                '2027-01-06',
                '2027-01-11',
                '2027-01-13',
                '2027-01-18',
                '2027-01-20',
                '2027-01-25',
                '2027-01-27',
            ],
        );
    });

    it('las fechas límite están incluidas', () => {
        const list = expandRecurrence(
            rule({ from: '2027-01-06', to: '2027-01-13', weekdays: [3] }),
        );

        assert.equal(list.length, 2);
    });

    it('domingo es el día 7', () => {
        const list = expandRecurrence(
            rule({ from: '2027-01-03', to: '2027-01-03', weekdays: [7] }),
        );

        assert.equal(list.length, 1);
        assert.equal(madridWeekday(list[0]!.startsAt), 'Sun');
    });

    it('cada día del año supera el máximo: too_many', () => {
        assertFails(rule({ weekdays: [1, 2, 3, 4, 5, 6, 7] }), 'too_many');
        assert.ok(MAX_OCCURRENCES >= 52);
    });

    it('rango sin ningún día coincidente: empty', () => {
        // El 7 de enero de 2027 es jueves.
        assertFails(
            rule({ from: '2027-01-07', to: '2027-01-07', weekdays: [3] }),
            'empty',
        );
    });

    it('rango invertido, fechas irreales o fin no posterior al inicio: invalid_range', () => {
        assertFails(rule({ from: '2027-02-01', to: '2027-01-01' }), 'invalid_range');
        assertFails(rule({ to: '2027-02-30' }), 'invalid_range');
        assertFails(rule({ startTime: '13:00', endTime: '13:00' }), 'invalid_range');
        assertFails(rule({ startTime: '13:00', endTime: '09:00' }), 'invalid_range');
    });

    it('rango de décadas: range_too_long, sin recorrerlo', () => {
        assertFails(rule({ from: '2027-01-01', to: '2099-12-31' }), 'range_too_long');
    });
});
